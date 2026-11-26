import { imageDataUrl as dataUrl } from './images.mjs';
import { extractJson, fetchWeatherContext, formatWeatherContext, normalizeAnalysis, normalizeStyleOption } from './gemini.mjs';

const retryable = (status) => status === 408 || status === 429 || status >= 500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const apiError = async (response) => {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message || body;
  } catch {
    return body.slice(0, 800) || `Request failed with HTTP ${response.status}.`;
  }
};

export const createOpenRouterService = (apiKey, textModel = 'stealth/ox-alpha', imageGeneratorOverride = null) => {
  if (!apiKey) throw new Error('An OpenRouter API key is required. Add OPENROUTER_API_KEY to .env.local or enter a key in the model selector.');

  const createResponse = async (payload) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch('https://openrouter.ai/api/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Nano Curator',
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) return response.json();
      if (retryable(response.status) && attempt < 2) {
        await response.text().catch(() => undefined);
        await sleep(700 * (2 ** attempt));
        continue;
      }
      throw new Error('OpenRouter API error: ' + await apiError(response));
    }
    throw new Error('OpenRouter API error: The request could not be completed after several attempts.');
  };

  const textFromResponse = (response) => response.output_text
    || (response.output || []).flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text
    || '';

  const analyzeStyleRequest = async (data, isMore = false, existingLookTitles = []) => {
    const weather = await fetchWeatherContext(data);
    const content = [];
    data.userPhotos.forEach((photo, index) => {
      content.push({ type: 'input_image', image_url: dataUrl(photo) });
      content.push({ type: 'input_text', text: index === 0 ? 'Primary identity photo.' : 'Additional identity reference.' });
    });
    data.wardrobePhotos.forEach((photo) => {
      content.push({ type: 'input_image', image_url: dataUrl(photo) });
      content.push({ type: 'input_text', text: 'Owned wardrobe reference.' });
    });
    if (data.referenceImage) content.push({ type: 'input_image', image_url: dataUrl(data.referenceImage) });
    if (data.garmentImage) {
      content.push({ type: 'input_image', image_url: dataUrl(data.garmentImage) });
      content.push({ type: 'input_text', text: 'Target garment: feature this exact garment in every look.' });
    }
    content.push({ type: 'input_text', text: `You are an elite personal stylist, personal brand consultant, and sustainable fashion advisor.
User: occasion ${data.occasion}; goal ${data.goals}; lifestyle ${data.lifestyle}; budget ${data.budget} ${data.budgetCap || ''}; climate ${data.climate}; dress code ${data.dressCode}; colors ${data.preferredColors || 'open'}; avoid ${data.avoidColors || 'none'}; brands to avoid ${data.avoidBrands || 'none'}.
Weather: ${formatWeatherContext(weather)}
Create exactly 3 ${isMore ? 'new and non-overlapping' : 'distinct'} practical looks. Existing titles to avoid: ${existingLookTitles.join(', ') || 'none'}. Reuse owned pieces first. Keep visualPrompt suitable for a single editorial full-body portrait. ${data.includeHaircut && !isMore ? 'Include one haircut.' : 'Omit haircut.'} ${data.findOutfits ? 'Include sensible shopping item suggestions, but never invent product URLs; use empty URLs when unverified.' : 'Use empty shoppingItems arrays.'}
Return only valid JSON with: summary {headline,bestLookId,bestLookReason,confidenceNote,nextStep}, faceShape, skinTone, bodyType, wardrobeSummary {detectedPieces,reusePlan,gapPieces}, personalBrand {archetype,strategicSummary,industryInsights,transformationStrategy,bodyAnalysis}, sustainableAdvice {wardrobeOptimization,versatilityGuide,purchaseGuidance}, styles [{id,title,description,reasoning,visualPrompt,palette,dressCodeNote,weatherNote,wardrobeAnchors,shoppingItems:[{name,brand,url,category,priceNote,reason,alternatives:[]}]}]${data.includeHaircut && !isMore ? ', haircut {styleName,description,maintenance,visualPrompt}' : ''}.` });

    const response = await createResponse({ model: textModel, input: [{ role: 'user', content }] });
    const text = textFromResponse(response);
    if (!text) throw new Error('No analysis returned from OpenRouter.');
    try { return normalizeAnalysis(extractJson(text), data.findOutfits, weather); }
    catch { throw new Error('OpenRouter returned an invalid style analysis.'); }
  };

  const extractWardrobeItems = async (sourceImage) => {
    const response = await createResponse({ model: textModel, input: [{ role: 'user', content: [
      { type: 'input_image', image_url: dataUrl(sourceImage) },
      { type: 'input_text', text: 'Inventory every distinct deliberately worn garment in this outfit photo. Exclude the person, jewelry, and scene. Return only JSON: {"items":[{"label":"short specific name","category":"tops|bottoms|outerwear|dresses|shoes|accessories|other","description":"visible color, material, silhouette, construction and pattern"}]}. Maximum 8 items.' },
    ] }] });
    let inventory;
    try { inventory = extractJson(textFromResponse(response)); } catch { throw new Error('OpenRouter could not identify the garments in this outfit.'); }
    const categories = new Set(['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories', 'other']);
    const items = Array.isArray(inventory.items) ? inventory.items.slice(0, 8).map((item) => ({
      label: String(item.label || 'Wardrobe item').slice(0, 80),
      category: categories.has(String(item.category).toLowerCase()) ? String(item.category).toLowerCase() : 'other',
      image: sourceImage,
      cutoutReady: false,
    })) : [];
    if (!items.length) throw new Error('No extractable garments were found in this photo.');
    return items;
  };

  const generateSingleImage = async (identityImage, garmentImage, prompt, isHaircut) => {
    if (imageGeneratorOverride) return imageGeneratorOverride(identityImage, garmentImage, prompt, isHaircut);
    return garmentImage || identityImage;
  };

  const transformLook = async (wizardData, identityImage, garmentImage, style, instruction) => {
    const weather = await fetchWeatherContext(wizardData);
    const response = await createResponse({ model: textModel, input: 'Update this outfit JSON according to the instruction. Keep the same id and return only valid JSON. Weather: ' + formatWeatherContext(weather) + '\nInstruction: ' + instruction + '\nCurrent look: ' + JSON.stringify(style) });
    const nextStyle = normalizeStyleOption(extractJson(textFromResponse(response)), 0, wizardData.findOutfits);
    return { style: nextStyle, image: garmentImage || identityImage };
  };

  const generateStyleSession = async (wizardData, isMore = false, existingLookTitles = []) => {
    const analysis = await analyzeStyleRequest(wizardData, isMore, existingLookTitles);
    const styleImages = {};
    const previewImage = wizardData.garmentImage || wizardData.userPhotos[0];
    analysis.styles.forEach((style) => { styleImages[style.id] = previewImage; });
    return { analysis, styleImages, haircutImage: null };
  };

  return { analyzeStyleRequest, generateSingleImage, extractWardrobeItems, transformLook, generateStyleSession };
};
