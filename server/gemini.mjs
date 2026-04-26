import { GoogleGenAI } from '@google/genai';

const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

const ensureArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : value ? [value] : []);

const slugify = (value, fallback) =>
  (value || fallback || 'look')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const uniqueBy = (items, keyBuilder) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyBuilder(item);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const extractJson = (text) => {
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
};

const parseMetaContent = (html, key, attr = 'property') => {
  const matcher = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i');
  return html.match(matcher)?.[1] ?? '';
};

const parseTitle = (html) => html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? '';

const fetchReferenceContext = async (referenceUrl) => {
  if (!referenceUrl) {
    return { parts: [], notes: [] };
  }

  try {
    const response = await fetch(referenceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 NanoCurator/1.0',
      },
    });

    if (!response.ok) {
      return {
        parts: [],
        notes: [`Reference URL: ${referenceUrl}`],
      };
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.startsWith('image/')) {
      const bytes = Buffer.from(await response.arrayBuffer());
      return {
        parts: [
          {
            inlineData: {
              data: bytes.toString('base64'),
              mimeType: contentType.split(';')[0],
            },
          },
        ],
        notes: [
          `The previous image came from the reference URL ${referenceUrl}. Use it as the target style direction.`,
        ],
      };
    }

    const html = await response.text();
    const title = parseTitle(html);
    const description = parseMetaContent(html, 'description', 'name') || parseMetaContent(html, 'og:description');
    const ogImage = parseMetaContent(html, 'og:image');
    const parts = [];
    const notes = [`Reference URL: ${referenceUrl}`];

    if (title) {
      notes.push(`Reference page title: ${title}`);
    }
    if (description) {
      notes.push(`Reference page description: ${description}`);
    }

    if (ogImage) {
      try {
        const imageUrl = new URL(ogImage, referenceUrl).toString();
        const imageResponse = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 NanoCurator/1.0',
          },
        });
        const imageContentType = imageResponse.headers.get('content-type') || '';
        if (imageResponse.ok && imageContentType.startsWith('image/')) {
          const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
          parts.push({
            inlineData: {
              data: imageBytes.toString('base64'),
              mimeType: imageContentType.split(';')[0],
            },
          });
          notes.push('The previous image was extracted from the reference page and should influence outfit direction.');
        }
      } catch {
        notes.push(`Reference page image: ${ogImage}`);
      }
    }

    return { parts, notes };
  } catch {
    return {
      parts: [],
      notes: [`Reference URL: ${referenceUrl}`],
    };
  }
};

const normalizeShoppingItems = (items) =>
  uniqueBy(
    ensureArray(items).map((item) => ({
      name: item?.name || 'Curated item',
      brand: item?.brand || 'Retailer',
      url: item?.url || '',
      category: item?.category || '',
      priceNote: item?.priceNote || '',
      reason: item?.reason || '',
    })),
    (item) => item.url || `${item.brand}-${item.name}`,
  );

const normalizeAnalysis = (parsed, findOutfits) => {
  const styles = ensureArray(parsed.styles).map((style, index) => ({
    id: style?.id || slugify(style?.title, `look-${index + 1}`),
    title: style?.title || `Look ${index + 1}`,
    description: style?.description || 'Style description not provided.',
    visualPrompt: style?.visualPrompt || '',
    reasoning: style?.reasoning || 'Reasoning not provided.',
    palette: ensureArray(style?.palette).slice(0, 5),
    dressCodeNote: style?.dressCodeNote || '',
    weatherNote: style?.weatherNote || '',
    shoppingItems: findOutfits ? normalizeShoppingItems(style?.shoppingItems) : [],
  }));

  const flattenedShopping = styles.flatMap((style) => style.shoppingItems);
  const fallbackShopping = normalizeShoppingItems(parsed.shoppingList);
  const shoppingList = uniqueBy([...flattenedShopping, ...fallbackShopping], (item) => item.url || `${item.brand}-${item.name}`);

  const bestLookId =
    parsed.summary?.bestLookId && styles.some((style) => style.id === parsed.summary.bestLookId)
      ? parsed.summary.bestLookId
      : styles[0]?.id || 'look-1';

  return {
    summary: {
      headline: parsed.summary?.headline || 'Curated style direction',
      bestLookId,
      bestLookReason: parsed.summary?.bestLookReason || 'The first look is the strongest fit for your goal and constraints.',
      confidenceNote:
        parsed.summary?.confidenceNote ||
        'These body and face observations are approximate. Use them as styling guidance rather than hard labels.',
      nextStep: parsed.summary?.nextStep || 'Start with the strongest look, then compare the alternates before buying.',
    },
    faceShape: parsed.faceShape || 'Not specified',
    skinTone: parsed.skinTone || 'Not specified',
    bodyType: parsed.bodyType || 'Not specified',
    personalBrand: parsed.personalBrand
      ? {
          archetype: parsed.personalBrand.archetype || 'Defined direction',
          strategicSummary: parsed.personalBrand.strategicSummary || '',
          industryInsights: ensureArray(parsed.personalBrand.industryInsights),
          transformationStrategy: ensureArray(parsed.personalBrand.transformationStrategy),
          bodyAnalysis: ensureArray(parsed.personalBrand.bodyAnalysis),
        }
      : undefined,
    sustainableAdvice: parsed.sustainableAdvice
      ? {
          wardrobeOptimization: ensureArray(parsed.sustainableAdvice.wardrobeOptimization),
          versatilityGuide: ensureArray(parsed.sustainableAdvice.versatilityGuide),
          purchaseGuidance: ensureArray(parsed.sustainableAdvice.purchaseGuidance),
        }
      : undefined,
    styles,
    haircut: parsed.haircut
      ? {
          styleName: parsed.haircut.styleName || 'Hair direction',
          description: parsed.haircut.description || '',
          maintenance: parsed.haircut.maintenance || 'Maintenance notes were not provided.',
          visualPrompt: parsed.haircut.visualPrompt || '',
        }
      : undefined,
    shoppingList: shoppingList.length > 0 ? shoppingList : undefined,
  };
};

export const createGeminiService = (apiKey) => {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Add it to .env.local before running the app.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const analyzeStyleRequest = async (data, isMore = false, existingLookTitles = []) => {
    const parts = [];

    data.userPhotos.forEach((photo, index) => {
      parts.push({
        inlineData: { data: photo, mimeType: 'image/jpeg' },
      });
      if (index === 0) {
        parts.push({ text: 'The previous image is the primary identity anchor. Preserve this facial identity in all generated outfit images.' });
      }
    });

    if (data.referenceImage) {
      parts.push({
        inlineData: { data: data.referenceImage, mimeType: 'image/jpeg' },
      });
      parts.push({ text: 'The previous image is a direct reference style image. Use it for silhouette, layering, and overall styling direction.' });
    }

    const referenceContext = await fetchReferenceContext(data.referenceUrl);
    parts.push(...referenceContext.parts);
    referenceContext.notes.forEach((note) => parts.push({ text: note }));

    const existingTitles = existingLookTitles.length > 0 ? existingLookTitles.join(', ') : 'none';
    const promptText = `
You are an elite personal stylist, personal brand consultant, and sustainable fashion advisor.

USER CONTEXT
- Occasion: ${data.occasion}
- Goal: ${data.goals}
- Lifestyle and constraints: ${data.lifestyle}
- Budget: ${data.budget}
- Climate: ${data.climate}
- Dress code: ${data.dressCode}
- Location: ${data.location || 'Not provided'}
- Weather notes: ${data.weatherNotes || 'Not provided'}
- Preferred colors: ${data.preferredColors || 'Not provided'}
- Avoid colors: ${data.avoidColors || 'Not provided'}
- Brands to avoid: ${data.avoidBrands || 'Not provided'}

TASK
1. Analyze the user photos for face shape, skin tone, and overall body styling considerations.
2. Generate exactly 3 ${isMore ? 'new, distinct, non-overlapping' : 'distinct'} looks that solve the stated goal.
3. Recommend the best look and explain why it should be tried first.
4. ${data.includeHaircut && !isMore ? 'Also recommend one haircut direction.' : 'Do not generate a haircut direction in this pass.'}
5. ${data.findOutfits ? 'Attach specific buyable products to each look.' : 'Do not attach shopping links.'}

RULES
- Existing looks to avoid repeating: ${existingTitles}
- Each look must be materially different in silhouette, layering, or setting.
- Keep recommendations practical for the stated budget, climate, and dress code.
- If a reference image or URL was provided, use it as directional input without copying it blindly when it conflicts with the user context.
- Body and face analysis should be framed as approximate style guidance, not certainty.

Return ONLY JSON with this shape:
{
  "summary": {
    "headline": "Short headline",
    "bestLookId": "look-1",
    "bestLookReason": "Why this look is the strongest starting point",
    "confidenceNote": "Short caveat about uncertainty and fit testing",
    "nextStep": "Actionable next step"
  },
  "faceShape": "string",
  "skinTone": "string",
  "bodyType": "string",
  "personalBrand": {
    "archetype": "2-4 word archetype",
    "strategicSummary": "2 sentence summary",
    "industryInsights": ["3 bullets"],
    "transformationStrategy": ["3 bullets"],
    "bodyAnalysis": ["3 bullets"]
  },
  "sustainableAdvice": {
    "wardrobeOptimization": ["3 bullets"],
    "versatilityGuide": ["3 bullets"],
    "purchaseGuidance": ["3 bullets"]
  },
  "styles": [
    {
      "id": "look-1",
      "title": "Look title",
      "description": "Editorial but practical summary",
      "reasoning": "Why it fits this person",
      "visualPrompt": "Image prompt for a single full body studio image of the user wearing this look",
      "palette": ["color 1", "color 2", "color 3"],
      "dressCodeNote": "How this fits the dress code",
      "weatherNote": "How this handles weather or climate",
      "shoppingItems": ${
        data.findOutfits
          ? `[
        {
          "name": "Product name",
          "brand": "Brand",
          "url": "Direct product URL",
          "category": "Category",
          "priceNote": "Budget context",
          "reason": "Why this item supports the look"
        }
      ]`
          : '[]'
      }
    }
  ]${data.includeHaircut && !isMore ? `,
  "haircut": {
    "styleName": "Haircut name",
    "description": "What it does for the user",
    "maintenance": "How much upkeep it needs",
    "visualPrompt": "Head-and-shoulders portrait prompt showing the full haircut"
  }` : ''}
}${data.findOutfits ? '\nUse Google Search to find real products and attach them to the correct look.' : ''}
`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: { parts },
      config: {
        tools: data.findOutfits ? [{ googleSearch: {} }] : [],
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No analysis returned from Gemini.');
    }

    let parsed;
    try {
      parsed = extractJson(text);
    } catch (error) {
      console.error('Failed to parse Gemini JSON', text);
      throw new Error('The model returned an invalid analysis payload.');
    }

    return normalizeAnalysis(parsed, data.findOutfits);
  };

  const generateSingleImage = async (baseIdentityImage, visualPrompt, isHaircut) => {
    const framingPrompt = isHaircut
      ? 'Cinematic head and shoulders portrait, clear hairline visibility, sharp focus on hair texture'
      : 'High fashion editorial photography, single full body shot';

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: baseIdentityImage,
              mimeType: 'image/jpeg',
            },
          },
          {
            text: `${framingPrompt}. ${visualPrompt}. Maintain strict facial identity from the source image.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: '3:4',
        },
      },
    });

    const responseParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of responseParts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }

    throw new Error('No image was generated.');
  };

  const generateMakeoverGallery = async (baseIdentityImage, items) => {
    const results = await Promise.all(items.map((item) => generateSingleImage(baseIdentityImage, item.prompt, item.isHaircut)));
    return results;
  };

  const generateStyleSession = async (wizardData, isMore = false, existingLookTitles = []) => {
    const analysis = await analyzeStyleRequest(wizardData, isMore, existingLookTitles);
    const galleryItems = analysis.styles.map((style) => ({ prompt: style.visualPrompt, isHaircut: false }));
    if (analysis.haircut?.visualPrompt) {
      galleryItems.push({ prompt: analysis.haircut.visualPrompt, isHaircut: true });
    }

    const generatedImages = await generateMakeoverGallery(wizardData.userPhotos[0], galleryItems);
    const styleImages = {};
    analysis.styles.forEach((style, index) => {
      styleImages[style.id] = generatedImages[index];
    });

    return {
      analysis,
      styleImages,
      haircutImage: analysis.haircut ? generatedImages[generatedImages.length - 1] : null,
    };
  };

  return {
    analyzeStyleRequest,
    generateSingleImage,
    generateStyleSession,
  };
};
