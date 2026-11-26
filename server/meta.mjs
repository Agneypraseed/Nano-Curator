import sharp from 'sharp';
import { createSamExtractor } from './meta-sam.mjs';
import { imageDataUrl } from './images.mjs';
import { extractJson, fetchWeatherContext, formatWeatherContext, normalizeAnalysis, normalizeStyleOption } from './gemini.mjs';

export const DEFAULT_META_MODEL = 'muse-spark-1.3';
const META_IMAGE_MODEL = 'muse-image-1.0';
const asImage = (image) => ({ type: 'input_image', image_url: imageDataUrl(image) });
const asText = (text) => ({ type: 'input_text', text });
const message = (content) => [{ role: 'user', content }];

function textBlocks(response) {
  const message = (response.output || []).findLast((item) => item.type === 'message');
  return (message?.content || []).filter((item) => item.type === 'output_text');
}

function responseText(response) {
  return textBlocks(response).map((block) => block.text).join('\n') || response.output_text || '';
}

function cleanProductUrl(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    url.hash = '';
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.startsWith('utm_') || ['gclid', 'fbclid'].includes(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return '';
  }
}

function productText(value, fallback, limit) {
  return String(value || fallback).replace(/\s*【\d+†[^】]+】/g, '')
    .replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function createMetaService(apiKey, model = DEFAULT_META_MODEL) {
  if (!apiKey?.trim()) throw new Error('Add META_API_KEY to .env.local or enter a key under Meta in Model settings.');

  async function request(payload) {
    let response;
    try {
      response = await fetch('https://api.meta.ai/v1/responses', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey.trim(), 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({ store: false, ...payload }),
      });
    } catch {
      throw new Error('Could not reach Meta Model API. Try again in a moment.');
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const detail = typeof body.error?.message === 'string' ? body.error.message.split(apiKey.trim()).join('[redacted]').slice(0, 240) : '';
      throw new Error('Meta Model API returned HTTP ' + response.status + (detail ? ': ' + detail : '.'));
    }
    const result = await response.json();
    if (result.status === 'failed' || result.status === 'incomplete') {
      throw new Error('Meta did not complete the ' + payload.model + ' response. Try again.');
    }
    return result;
  }

  const extractWardrobeItems = createSamExtractor({ request, model, responseText });

  async function findGarmentMatches({ image, query, outfit = false }) {
    const response = await request({
      model: DEFAULT_META_MODEL,
      tools: [{ type: 'web_search', search_context_size: 'medium' }],
      include: ['web_search_call.results'],
      input: message([
        ...(image ? [asImage(image)] : []),
        asText([
          outfit
            ? 'Use current web search to find up to six individual retailer product listings for the main shoppable pieces of this outfit. Cover several distinct pieces and prioritize the colors, silhouettes, and patterns shown or described. If there is no exact option, broaden minor details to find close alternatives.'
            : 'Use current web search to find up to six individual product listings that resemble the item shown or described. Prioritize color, silhouette, and pattern. If there is no exact option, broaden minor details to find close alternatives across stores.',
          'Exclude category pages, blogs and image-only pages. Use direct URL strings from actual search results; never invent links or availability. Include a listed price only when the source shows it. Describe the visible similarity without claiming an exact product identification. Keep the fields free of inline citation markers.',
          query && (outfit ? 'Outfit description: ' : 'Garment description: ') + JSON.stringify(query),
          'Return a JSON object with an items array. Each item has name, brand (retailer or brand), url (exact URL), priceNote and reason. Use short strings. Return an empty items array if no listings were found.',
        ].join('\n')),
      ]),
    });
    const searches = (response.output || []).filter((item) => item.type === 'web_search_call');
    const sourceUrls = new Set([
      ...searches.flatMap((search) => (search.results || []).map((result) => cleanProductUrl(result.url))),
      ...textBlocks(response).flatMap((block) => (block.annotations || [])
        .filter((annotation) => annotation.type === 'url_citation')
        .map((annotation) => cleanProductUrl(annotation.url))),
    ]);
    let items = [];
    try {
      items = extractJson(responseText(response)).items;
    } catch {
      // Keep final-answer citations when the model formats a grounded answer as prose.
      items = textBlocks(response).flatMap((block) => (block.annotations || [])
        .filter((annotation) => annotation.type === 'url_citation')
        .map((annotation) => ({ name: annotation.title, url: annotation.url })));
    }
    const results = [];
    const seen = new Set();
    for (const item of Array.isArray(items) ? items : []) {
      const url = cleanProductUrl(item?.url);
      if (!url || !sourceUrls.has(url) || seen.has(url)) continue;
      seen.add(url);
      results.push({
        name: productText(item.name, 'Similar item', 160),
        brand: productText(item.brand, new URL(url).hostname, 100),
        priceNote: productText(item.priceNote, '', 80),
        reason: productText(item.reason, '', 300),
        url,
      });
      if (results.length === 6) break;
    }
    return results;
  }

  async function analyzeStyleRequest(data, isMore, existingLookTitles) {
    const weather = await fetchWeatherContext(data);
    const content = [
      ...data.userPhotos.flatMap((photo, index) => [asText(index === 0 ? 'Primary identity photo' : 'Additional identity photo'), asImage(photo)]),
      ...data.wardrobePhotos.flatMap((photo) => [asText('Owned wardrobe piece'), asImage(photo)]),
      ...(data.referenceImage ? [asText('Style inspiration'), asImage(data.referenceImage)] : []),
      ...(data.garmentImage ? [asText('Target garment. Work it into each outfit.'), asImage(data.garmentImage)] : []),
      asText([
        'You are a personal stylist. Build practical, distinct head-to-toe looks and explain which one works best. Reuse owned pieces first.',
        'Style brief: ' + JSON.stringify({
          occasion: data.occasion, goals: data.goals, lifestyle: data.lifestyle, budget: data.budget,
          budgetCap: data.budgetCap, climate: data.climate, dressCode: data.dressCode, colors: data.preferredColors,
          avoidColors: data.avoidColors, avoidBrands: data.avoidBrands, referenceUrl: data.referenceUrl,
        }),
        'Weather: ' + formatWeatherContext(weather),
        'Create exactly three looks with unique ids. ' + (isMore ? 'Avoid repeating these looks: ' + existingLookTitles.join(', ') : ''),
        data.findOutfits ? 'Suggest products where relevant. Leave the URL empty when you cannot verify it.' : 'Return empty shoppingItems arrays.',
        'Return only valid JSON with summary {headline,bestLookId,bestLookReason,confidenceNote,nextStep}, faceShape, skinTone, bodyType, wardrobeSummary {detectedPieces,reusePlan,gapPieces}, personalBrand {archetype,strategicSummary,industryInsights,transformationStrategy,bodyAnalysis}, sustainableAdvice {wardrobeOptimization,versatilityGuide,purchaseGuidance}, styles [{id,title,description,reasoning,visualPrompt,palette,dressCodeNote,weatherNote,wardrobeAnchors,shoppingItems:[{name,brand,url,category,priceNote,reason,alternatives:[]}]}]' +
          (data.includeHaircut && !isMore ? ', haircut {styleName,description,maintenance,visualPrompt}.' : '.'),
      ].join('\n')),
    ];
    const response = await request({ model, input: message(content) });
    return normalizeAnalysis(extractJson(responseText(response)), data.findOutfits, weather);
  }

  async function generateSingleImage(identityImage, garmentImage, visualPrompt, isHaircut = false) {
    const subject = isHaircut ? 'a head-and-shoulders hairstyle portrait' : 'a full-body editorial outfit portrait';
    const content = [asImage(identityImage)];
    if (garmentImage && !isHaircut) content.push(asImage(garmentImage));
    content.push(asText('Create ' + subject + ' preserving the person’s identity and body proportions from the first photo. ' +
      (garmentImage && !isHaircut ? 'Use the exact target garment in the second image. ' : '') + visualPrompt));
    const response = await request({ model: META_IMAGE_MODEL, input: message(content) });
    const image = (response.output || []).find((item) => item.type === 'image_generation_call')?.result;
    if (!image) throw new Error('Muse Image did not return a preview.');
    const bytes = await sharp(Buffer.from(image, 'base64'))
      .resize({ width: 1152, height: 1400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 83 })
      .toBuffer();
    return imageDataUrl(bytes.toString('base64'));
  }

  async function transformLook(wizardData, identityImage, garmentImage, style, instruction) {
    const response = await request({
      model,
      input: 'Revise this style according to the instruction. Preserve its id and return only the updated JSON object.\nInstruction: ' +
        instruction + '\nLook: ' + JSON.stringify(style),
    });
    const updated = { ...normalizeStyleOption(extractJson(responseText(response)), 0, wizardData.findOutfits), id: style.id };
    return { style: updated, image: await generateSingleImage(identityImage, garmentImage, updated.visualPrompt) };
  }

  async function generateStyleSession(wizardData, isMore = false, existingLookTitles = []) {
    const analysis = await analyzeStyleRequest(wizardData, isMore, existingLookTitles);
    const identity = wizardData.userPhotos[0];
    const styleResults = await Promise.allSettled(analysis.styles.map(async (style) => [
      style.id, await generateSingleImage(identity, wizardData.garmentImage, style.visualPrompt),
    ]));
    const styleImages = Object.fromEntries(styleResults.filter((result) => result.status === 'fulfilled').map((result) => result.value));
    let haircutImage = null;
    if (analysis.haircut) {
      haircutImage = await generateSingleImage(identity, null, analysis.haircut.visualPrompt, true).catch(() => null);
    }
    return { analysis, styleImages, haircutImage };
  }

  return { extractWardrobeItems, findGarmentMatches, generateStyleSession, generateSingleImage, transformLook };
}
