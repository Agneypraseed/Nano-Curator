import { extractJson, fetchWeatherContext, formatWeatherContext, normalizeAnalysis, normalizeStyleOption } from './gemini.mjs';

const IMAGE_MODEL = 'gpt-image-2';

const MAX_API_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 700;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const isRetryableStatus = (status) => status === 408 || status === 429 || status >= 500;

const apiError = async (response) => {
  const body = await response.text();
  try {
    return JSON.parse(body)?.error?.message || body;
  } catch {
    const requestId = response.headers.get('x-request-id')
      || response.headers.get('cf-ray')
      || body.match(/Cloudflare Ray ID:\s*<strong[^>]*>([^<]+)/i)?.[1];
    if (/<html[\s>]/i.test(body)) {
      return `OpenAI is temporarily unavailable (HTTP ${response.status})${requestId ? `; reference ${requestId}` : ''}. Please try again.`;
    }
    return body.slice(0, 800) || `Request failed with HTTP ${response.status}.`;
  }
};

const dataUrl = (base64) => base64.startsWith('data:') ? base64 : 'data:image/jpeg;base64,' + base64;

const imageUpload = (image) => {
  const match = String(image).match(/^data:([^;]+);base64,(.*)$/s);
  const mimeType = match?.[1] || 'image/jpeg';
  const base64 = match?.[2] || image;
  const extension = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  return { blob: new Blob([Buffer.from(base64, 'base64')], { type: mimeType }), filename: 'outfit.' + extension };
};

export const createOpenAIService = (apiKey, textModel = 'gpt-5.4-nano') => {
  if (!apiKey) throw new Error('An OpenAI API key is required. Add OPENAI_API_KEY to .env.local or enter a key in the model selector.');

  const createResponse = async (payload) => {
    const maxAttempts = payload.tools?.some((tool) => tool.type === 'image_generation') ? 1 : MAX_API_ATTEMPTS;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
        body: JSON.stringify(payload),
      });
      if (response.ok) return response.json();

      if (isRetryableStatus(response.status) && attempt < maxAttempts - 1) {
        await response.text().catch(() => undefined);
        await sleep(RETRY_BASE_DELAY_MS * (2 ** attempt));
        continue;
      }

      throw new Error('OpenAI API error: ' + await apiError(response));
    }

    throw new Error('OpenAI API error: The request could not be completed after several attempts.');
  };

  const createImageEdit = async (sourceImage, prompt) => {
    const upload = imageUpload(sourceImage);
    const form = new FormData();
    form.append('model', IMAGE_MODEL);
    form.append('image', upload.blob, upload.filename);
    form.append('prompt', prompt);
    form.append('size', '1024x1024');
    form.append('quality', 'low');
    form.append('background', 'opaque');
    form.append('output_format', 'png');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey },
      body: form,
    });
    if (!response.ok) throw new Error('OpenAI image edit error: ' + await apiError(response));
    const payload = await response.json();
    const image = payload.data?.[0]?.b64_json;
    if (!image) throw new Error('OpenAI did not return a garment cutout.');
    return image;
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
      tools: [{ type: 'image_generation', model: IMAGE_MODEL, size: '1024x1536', quality: 'low' }],
      tool_choice: { type: 'image_generation' },
    });
    return imageFromResponse(response);
  };

  const wardrobeCategories = new Set(['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories', 'other']);
  const normalizeWardrobeCategory = (value) => wardrobeCategories.has(value) ? value : 'other';

  const extractWardrobeItems = async (sourceImage) => {
    const inventoryResponse = await createResponse({
      model: textModel,
      input: [{ role: 'user', content: [
        { type: 'input_image', image_url: dataUrl(sourceImage) },
        { type: 'input_text', text: 'Inventory every distinct deliberately worn garment in this outfit photo. Include tops, bottoms, outerwear, dresses, shoes, belts, bags, ties, and headwear. Exclude the person, jewelry, and scene. Return only JSON: {\"items\":[{\"label\":\"short specific name\",\"category\":\"tops|bottoms|outerwear|dresses|shoes|accessories|other\",\"description\":\"source-visible color, material, silhouette, construction and pattern; state uncertainty instead of guessing\"}]}. Keep source-proven layers separate. Only include a garment when some part of that garment is clearly visible; never invent footwear or another category from an unclear area. Maximum 8 items.' },
      ] }],
    });

    let inventory;
    try {
      inventory = extractJson(textFromResponse(inventoryResponse));
    } catch {
      throw new Error('OpenAI could not identify the garments in this outfit.');
    }
    const detected = Array.isArray(inventory.items) ? inventory.items.slice(0, 8) : [];
    if (!detected.length) throw new Error('No extractable garments were found in this photo.');

    const items = [];
    for (const detectedItem of detected) {
      const label = String(detectedItem.label || 'Wardrobe item').slice(0, 80);
      const category = normalizeWardrobeCategory(String(detectedItem.category || '').toLowerCase());
      const description = String(detectedItem.description || label).slice(0, 900);
      const cutoutPrompt = 'Reconstruct ONLY this exact garment from the outfit photo as a clean ecommerce catalog cutout: ' + label + '. Source evidence: ' + description + '. Remove the wearer, body, skin, hair, underlayers, other clothing, props, and scene. Show one complete empty item, centered with generous padding. Preserve only source-supported color, material, silhouette, construction, pattern, and legible marks. Do not invent hidden details, branding, text, pockets, fasteners, or hardware. Solid warm-white catalog background; no mannequin, hanger, dramatic shadow, reflection, caption, border, or watermark.';
      try {
        items.push({ label, category, image: await createImageEdit(sourceImage, cutoutPrompt), cutoutReady: true });
      } catch (error) {
        console.warn('Garment cutout failed; preserving detected item:', label, error instanceof Error ? error.message : error);
        items.push({ label, category, image: sourceImage, cutoutReady: false });
      }
    }
    return items;
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

  return { analyzeStyleRequest, generateSingleImage, extractWardrobeItems, transformLook, generateStyleSession };
};
