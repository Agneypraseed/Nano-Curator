import { extractJson, fetchWeatherContext, formatWeatherContext, normalizeAnalysis, normalizeStyleOption } from './gemini.mjs';

const IMAGE_MODEL = 'gpt-image-2';

const apiError = async (response) => {
  const body = await response.text();
  try { return JSON.parse(body)?.error?.message || body; } catch { return body; }
};

const dataUrl = (base64) => base64.startsWith('data:') ? base64 : 'data:image/jpeg;base64,' + base64;

export const createOpenAIService = (apiKey, textModel = 'gpt-5.6-terra') => {
  if (!apiKey) throw new Error('An OpenAI API key is required. Add OPENAI_API_KEY to .env.local or enter a key in the model selector.');

  const createResponse = async (payload) => {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('OpenAI API error: ' + await apiError(response));
    return response.json();
  };

  const textFromResponse = (response) => {
    if (response.output_text) return response.output_text;
    return (response.output || []).flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text || '';
  };

  const imageFromResponse = (response) => {
    const call = (response.output || []).find((item) => item.type === 'image_generation_call' && item.result);
    if (!call?.result) throw new Error('OpenAI did not return an image.');
    return 'data:image/png;base64,' + call.result;
  };

  const analyzeStyleRequest = async (data, isMore = false, existingLookTitles = []) => {
    const weather = await fetchWeatherContext(data);
    const content = [];
    data.userPhotos.forEach((photo, index) => {
      content.push({ type: 'input_image', image_url: dataUrl(photo) });
      content.push({ type: 'input_text', text: index === 0 ? 'Primary identity photo.' : 'Additional identity reference.' });
    });
    data.wardrobePhotos.forEach((photo) => { content.push({ type: 'input_image', image_url: dataUrl(photo) }); content.push({ type: 'input_text', text: 'Owned wardrobe reference.' }); });
    if (data.referenceImage) content.push({ type: 'input_image', image_url: dataUrl(data.referenceImage) });
    if (data.garmentImage) { content.push({ type: 'input_image', image_url: dataUrl(data.garmentImage) }); content.push({ type: 'input_text', text: 'Target garment: feature this exact garment in every look.' }); }

    const prompt = `You are an elite personal stylist, personal brand consultant, and sustainable fashion advisor.
User: occasion ${data.occasion}; goal ${data.goals}; lifestyle ${data.lifestyle}; budget ${data.budget} ${data.budgetCap || ''}; climate ${data.climate}; dress code ${data.dressCode}; colors ${data.preferredColors || 'open'}; avoid ${data.avoidColors || 'none'}; brands to avoid ${data.avoidBrands || 'none'}.
Weather: ${formatWeatherContext(weather)}
Create exactly 3 ${isMore ? 'new and non-overlapping' : 'distinct'} practical looks. Existing titles to avoid: ${existingLookTitles.join(', ') || 'none'}. Reuse owned pieces first. Keep visualPrompt suitable for a single editorial ${data.garmentImage ? 'try-on using the exact target garment' : 'full-body portrait'}. ${data.includeHaircut && !isMore ? 'Include one haircut.' : 'Omit haircut.'} ${data.findOutfits ? 'Include sensible shopping item suggestions, but never invent product URLs; use empty URLs when unverified.' : 'Use empty shoppingItems arrays.'}
Return only valid JSON with: summary {headline,bestLookId,bestLookReason,confidenceNote,nextStep}, faceShape, skinTone, bodyType, wardrobeSummary {detectedPieces,reusePlan,gapPieces}, personalBrand {archetype,strategicSummary,industryInsights,transformationStrategy,bodyAnalysis}, sustainableAdvice {wardrobeOptimization,versatilityGuide,purchaseGuidance}, styles [{id,title,description,reasoning,visualPrompt,palette,dressCodeNote,weatherNote,wardrobeAnchors,shoppingItems:[{name,brand,url,category,priceNote,reason,alternatives:[]}]}]${data.includeHaircut && !isMore ? ', haircut {styleName,description,maintenance,visualPrompt}' : ''}.`;
    content.push({ type: 'input_text', text: prompt });
    const response = await createResponse({ model: textModel, input: [{ role: 'user', content }] });
    const text = textFromResponse(response);
    if (!text) throw new Error('No analysis returned from OpenAI.');
    try { return normalizeAnalysis(extractJson(text), data.findOutfits, weather); }
    catch { throw new Error('OpenAI returned an invalid style analysis. Please try again.'); }
  };

  const generateSingleImage = async (identityImage, garmentImage, visualPrompt, isHaircut) => {
    const content = [{ type: 'input_image', image_url: dataUrl(identityImage) }];
    if (garmentImage) content.push({ type: 'input_image', image_url: dataUrl(garmentImage) });
    const framing = isHaircut ? 'head-and-shoulders haircut portrait' : 'single full-body editorial fashion portrait';
    content.push({ type: 'input_text', text: 'Create a ' + framing + '. Preserve the identity of the first person. ' + (garmentImage ? 'Dress them in the exact garment from the second image. ' : '') + visualPrompt });
    const response = await createResponse({
      model: textModel,
      input: [{ role: 'user', content }],
      tools: [{ type: 'image_generation', model: IMAGE_MODEL, size: '1024x1536', quality: 'medium' }],
      tool_choice: { type: 'image_generation' },
    });
    return imageFromResponse(response);
  };

  const extractWardrobeCutout = async (sourceImage) => {
    const response = await createResponse({
      model: textModel,
      input: [{ role: 'user', content: [
        { type: 'input_image', image_url: dataUrl(sourceImage) },
        { type: 'input_text', text: 'Extract only the dominant worn garment as a centered ecommerce catalog cutout. Remove the person and scene. Preserve visible construction and color. Use a transparent background and invent nothing.' },
      ] }],
      tools: [{ type: 'image_generation', model: IMAGE_MODEL, size: '1024x1024', quality: 'medium', background: 'transparent' }],
      tool_choice: { type: 'image_generation' },
    });
    return imageFromResponse(response).replace(/^data:image\/png;base64,/, '');
  };

  const transformLook = async (wizardData, identityImage, garmentImage, style, instruction) => {
    const weather = await fetchWeatherContext(wizardData);
    const prompt = 'Update this outfit JSON according to the instruction. Keep the same id and return only valid JSON. Weather: ' + formatWeatherContext(weather) + '\nInstruction: ' + instruction + '\nCurrent look: ' + JSON.stringify(style);
    const response = await createResponse({ model: textModel, input: prompt });
    const nextStyle = normalizeStyleOption(extractJson(textFromResponse(response)), 0, wizardData.findOutfits);
    const image = await generateSingleImage(identityImage, garmentImage, nextStyle.visualPrompt, false);
    return { style: nextStyle, image };
  };

  const generateStyleSession = async (wizardData, isMore = false, existingLookTitles = []) => {
    const analysis = await analyzeStyleRequest(wizardData, isMore, existingLookTitles);
    const items = analysis.styles.map((style) => ({ prompt: style.visualPrompt, haircut: false }));
    if (analysis.haircut?.visualPrompt) items.push({ prompt: analysis.haircut.visualPrompt, haircut: true });
    const images = [];
    for (const item of items) images.push(await generateSingleImage(wizardData.userPhotos[0], wizardData.garmentImage, item.prompt, item.haircut));
    const styleImages = {};
    analysis.styles.forEach((style, index) => { styleImages[style.id] = images[index]; });
    return { analysis, styleImages, haircutImage: analysis.haircut ? images[images.length - 1] : null };
  };

  return { analyzeStyleRequest, generateSingleImage, extractWardrobeCutout, transformLook, generateStyleSession };
};
