// Utilities duplicated from gemini.mjs to keep the file standalone for this migration

const WEATHER_CODE_LABELS = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
};

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

const formatTemperatureBand = (low, high) => {
  if (typeof low !== 'number' || typeof high !== 'number') {
    return '';
  }
  return `${Math.round(low)}-${Math.round(high)} C`;
};

const formatWeatherContext = (weatherContext) => {
  if (!weatherContext || weatherContext.source === 'none') {
    return 'No weather context available.';
  }

  return [
    `Weather source: ${weatherContext.source}`,
    `Location: ${weatherContext.location}`,
    `Summary: ${weatherContext.summary}`,
    weatherContext.temperatureBand ? `Temperature band: ${weatherContext.temperatureBand}` : '',
    weatherContext.stylingNotes.length > 0 ? `Styling notes: ${weatherContext.stylingNotes.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

const parseOwnedPieceHints = (items) => ensureArray(items).map((item) => item.toString()).slice(0, 5);

const normalizeAlternatives = (items) =>
  uniqueBy(
    ensureArray(items).map((item) => ({
      name: item?.name || 'Alternative item',
      brand: item?.brand || 'Retailer',
      url: item?.url || '',
      priceNote: item?.priceNote || '',
      reason: item?.reason || '',
    })),
    (item) => item.url || `${item.brand}-${item.name}`,
  );

const normalizeShoppingItems = (items) =>
  uniqueBy(
    ensureArray(items).map((item) => ({
      name: item?.name || 'Curated item',
      brand: item?.brand || 'Retailer',
      url: item?.url || '',
      category: item?.category || '',
      priceNote: item?.priceNote || '',
      reason: item?.reason || '',
      alternatives: normalizeAlternatives(item?.alternatives),
    })),
    (item) => item.url || `${item.brand}-${item.name}`,
  );

const normalizeStyleOption = (style, index = 0, findOutfits = true) => ({
  id: style?.id || slugify(style?.title, `look-${index + 1}`),
  title: style?.title || `Look ${index + 1}`,
  description: style?.description || 'Style description not provided.',
  visualPrompt: style?.visualPrompt || '',
  reasoning: style?.reasoning || 'Reasoning not provided.',
  palette: ensureArray(style?.palette).slice(0, 5),
  dressCodeNote: style?.dressCodeNote || '',
  weatherNote: style?.weatherNote || '',
  wardrobeAnchors: parseOwnedPieceHints(style?.wardrobeAnchors),
  shoppingItems: findOutfits ? normalizeShoppingItems(style?.shoppingItems) : [],
});

const normalizeAnalysis = (parsed, findOutfits, weatherContext) => {
  const styles = ensureArray(parsed.styles).map((style, index) => normalizeStyleOption(style, index, findOutfits));

  const flattenedShopping = styles.flatMap((style) => style.shoppingItems);
  const fallbackShopping = normalizeShoppingItems(parsed.shoppingList);
  const shoppingList = uniqueBy(
    [...flattenedShopping, ...fallbackShopping],
    (item) => item.url || `${item.brand}-${item.name}`,
  );

  const bestLookId =
    parsed.summary?.bestLookId && styles.some((style) => style.id === parsed.summary.bestLookId)
      ? parsed.summary.bestLookId
      : styles[0]?.id || 'look-1';

  return {
    summary: {
      headline: parsed.summary?.headline || 'Curated style direction',
      bestLookId,
      bestLookReason:
        parsed.summary?.bestLookReason || 'The first look is the strongest fit for your goal and constraints.',
      confidenceNote:
        parsed.summary?.confidenceNote ||
        'These body and face observations are approximate. Use them as styling guidance rather than hard labels.',
      nextStep:
        parsed.summary?.nextStep || 'Start with the strongest look, then compare the alternates before buying.',
    },
    faceShape: parsed.faceShape || 'Not specified',
    skinTone: parsed.skinTone || 'Not specified',
    bodyType: parsed.bodyType || 'Not specified',
    weatherContext,
    wardrobeSummary: parsed.wardrobeSummary
      ? {
          detectedPieces: ensureArray(parsed.wardrobeSummary.detectedPieces),
          reusePlan: ensureArray(parsed.wardrobeSummary.reusePlan),
          gapPieces: ensureArray(parsed.wardrobeSummary.gapPieces),
        }
      : undefined,
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

const fetchReferenceContext = async (referenceUrl) => {
  if (!referenceUrl) {
    return { notes: [] };
  }
  // Simplified for local LLM (no vision for URLs right now, just metadata text)
  try {
    const response = await fetch(referenceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 NanoCurator/1.0',
      },
    });

    if (!response.ok) {
      return { notes: [`Reference URL: ${referenceUrl}`] };
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('image/')) {
        return { notes: [`The user provided a reference image URL: ${referenceUrl}.`] };
    }

    const html = await response.text();
    const title = parseTitle(html);
    const description = parseMetaContent(html, 'description', 'name') || parseMetaContent(html, 'og:description');
    
    const notes = [`Reference URL: ${referenceUrl}`];

    if (title) {
      notes.push(`Reference page title: ${title}`);
    }
    if (description) {
      notes.push(`Reference page description: ${description}`);
    }

    return { notes };
  } catch {
    return {
      notes: [`Reference URL: ${referenceUrl}`],
    };
  }
};

const fetchWeatherContext = async (wizardData) => {
  const manualNotes = wizardData.weatherNotes?.trim();
  const location = wizardData.location?.trim();

  if (wizardData.weatherMode === 'manual' || !location) {
    if (manualNotes) {
      return {
        source: 'manual',
        location: location || 'Manual weather notes',
        summary: manualNotes,
        stylingNotes: [manualNotes],
      };
    }
    return {
      source: 'none',
      location: '',
      summary: '',
      stylingNotes: [],
    };
  }

  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
    );
    const geoData = await geoResponse.json();
    const result = geoData?.results?.[0];
    if (!result?.latitude || !result?.longitude) {
      throw new Error('No geocode result');
    }

    const forecastResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${result.latitude}&longitude=${result.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`,
    );
    const forecast = await forecastResponse.json();
    const current = forecast?.current || {};
    const daily = forecast?.daily || {};
    const maxTemp = daily.temperature_2m_max?.[0];
    const minTemp = daily.temperature_2m_min?.[0];
    const precipitation = daily.precipitation_probability_max?.[0];
    const weatherLabel = WEATHER_CODE_LABELS[current.weather_code] || 'Variable weather';
    const stylingNotes = [
      typeof current.temperature_2m === 'number' ? `Current temperature around ${Math.round(current.temperature_2m)} C.` : '',
      typeof precipitation === 'number' && precipitation >= 40 ? 'Prepare for precipitation and water-resistant footwear.' : '',
      wizardData.climate === 'cold' || (typeof maxTemp === 'number' && maxTemp < 12)
        ? 'Favor layering, warmer outerwear, and insulating fabrics.'
        : '',
      wizardData.climate === 'hot' || (typeof maxTemp === 'number' && maxTemp > 24)
        ? 'Favor breathable fabrics and lighter layers.'
        : '',
      manualNotes || '',
    ].filter(Boolean);

    return {
      source: 'live',
      location: `${result.name}${result.country ? `, ${result.country}` : ''}`,
      summary: `${weatherLabel}${typeof current.temperature_2m === 'number' ? ` at about ${Math.round(current.temperature_2m)} C` : ''}`,
      temperatureBand: formatTemperatureBand(minTemp, maxTemp),
      stylingNotes,
    };
  } catch {
    if (manualNotes) {
      return {
        source: 'manual',
        location: location || 'Manual weather notes',
        summary: manualNotes,
        stylingNotes: [manualNotes],
      };
    }
    return {
      source: 'none',
      location: location || '',
      summary: '',
      stylingNotes: [],
    };
  }
};

export const createLocalService = (config = {}) => {
  const textApiUrl = config.textApiUrl || 'http://localhost:11434/v1';
  const textModel = config.textModel || 'llama3.1:8b';
  // VTON API assumes an IDM-VTON Gradio endpoint standard schema
  const vtonApiUrl = config.vtonApiUrl || 'http://127.0.0.1:7860';

  const analyzeStyleRequest = async (data, isMore = false, existingLookTitles = []) => {
    // We construct a purely text-based prompt since standard local models might not have vision.
    // If you are running LLaVA, you can attach images in the OpenAI format. We will stick to text + references for robust compatibility.
    
    const referenceContext = await fetchReferenceContext(data.referenceUrl);
    const weatherContext = await fetchWeatherContext(data);
    const existingTitles = existingLookTitles.length > 0 ? existingLookTitles.join(', ') : 'none';
    
    const promptText = `
You are an elite personal stylist, personal brand consultant, and sustainable fashion advisor.

USER CONTEXT
- Occasion: ${data.occasion}
- Goal: ${data.goals}
- Lifestyle and constraints: ${data.lifestyle}
- Budget level: ${data.budget}
- Budget cap: ${data.budgetCap || 'Not provided'}
- Climate preference: ${data.climate}
- Dress code: ${data.dressCode}
- Location: ${data.location || 'Not provided'}
- Preferred colors: ${data.preferredColors || 'Not provided'}
- Avoid colors: ${data.avoidColors || 'Not provided'}
- Brands to avoid: ${data.avoidBrands || 'Not provided'}
- Additional Reference Notes: ${referenceContext.notes.join(' ')}
- Has Target Garment Image: ${data.garmentImage ? 'Yes (ensure this is accounted for in Look 1)' : 'No'}

WEATHER CONTEXT
${formatWeatherContext(weatherContext)}

TASK
1. Generate exactly 3 ${isMore ? 'new, distinct, non-overlapping' : 'distinct'} looks that solve the stated goal.
2. Recommend the best look and explain why it should be tried first.
3. ${data.includeHaircut && !isMore ? 'Also recommend one haircut direction.' : 'Do not generate a haircut direction in this pass.'}
4. ${data.findOutfits ? 'Attach specific buyable products to each look, and include at least one lower-cost alternative when possible.' : 'Do not attach shopping links.'}

RULES
- Existing looks to avoid repeating: ${existingTitles}
- Each look must be materially different in silhouette, layering, or setting.
- Keep recommendations practical for the stated budget, budget cap, climate, and dress code.
- If the user has a target Garment Image, tailor the first look completely around it.

Return ONLY JSON with this shape (strictly valid JSON!):
{
  "summary": {
    "headline": "Short headline",
    "bestLookId": "look-1",
    "bestLookReason": "Why this look is the strongest starting point",
    "confidenceNote": "Short caveat about uncertainty and fit testing",
    "nextStep": "Actionable next step"
  },
  "faceShape": "Unknown (Local Mode without Vision)",
  "skinTone": "Unknown",
  "bodyType": "Unknown",
  "wardrobeSummary": {
    "detectedPieces": [],
    "reusePlan": [],
    "gapPieces": []
  },
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
      "wardrobeAnchors": [],
      "shoppingItems": ${
        data.findOutfits
          ? `[
        {
          "name": "Product name",
          "brand": "Brand",
          "url": "Direct product URL",
          "category": "Category",
          "priceNote": "Budget context",
          "reason": "Why this item supports the look",
          "alternatives": []
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
}
`;

    const response = await fetch(`${textApiUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: textModel,
            messages: [
                { role: 'system', content: 'You are an elite personal stylist who only responds in valid JSON.' },
                { role: 'user', content: promptText }
            ],
            // Not all local models support response_format strict json, but Ollama supports this format hint
            format: 'json', 
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        throw new Error(`Local LLM API error: ${response.statusText}`);
    }

    const result = await response.json();
    const text = result.choices[0].message.content;

    let parsed;
    try {
      parsed = extractJson(text);
    } catch (error) {
      console.error('Failed to parse Local LLM JSON', text);
      throw new Error('The local model returned an invalid analysis payload.');
    }

    return normalizeAnalysis(parsed, data.findOutfits, weatherContext);
  };

  const generateSingleImage = async (baseIdentityImage, garmentImage, prompt, isHaircut) => {
    // If no garment image is provided but the user is trying to generate one in Local mode,
    // IDM-VTON will fail or require a dummy garment. We will throw an error to guide them.
    if (!garmentImage && !isHaircut) {
        throw new Error("Local VTON requires a Target Garment image to composite. Please upload one in the wizard.");
    }

    try {
        // IDM-VTON typical Gradio predict payload
        // This may vary depending on the exact branch/version of the local VTON model.
        // We will mock the standard Gradio API structure for image-to-image VTON here.
        // Example for IDM-VTON: [human_img, garment_img, garment_description, is_checked, is_checked, denoise_steps, seed]
        const response = await fetch(`${vtonApiUrl}/api/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: [
                    "data:image/jpeg;base64," + baseIdentityImage,
                    garmentImage ? "data:image/jpeg;base64," + garmentImage : null,
                    prompt, // text prompt
                    true,   // auto mask
                    true,   // auto crop
                    30,     // steps
                    42      // seed
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Local VTON API error: ${response.statusText}`);
        }

        const result = await response.json();
        // Gradio typically returns the output image base64 in data[0]
        const outImage = result.data[0]; 
        
        // Ensure it has the data prefix
        if (outImage && outImage.startsWith('data:')) {
            return outImage;
        } else {
            return `data:image/png;base64,${outImage}`;
        }
    } catch (e) {
        console.error("VTON generation failed:", e);
        throw new Error("Local VTON generation failed. Ensure your IDM-VTON Gradio server is running on port 7860.");
    }
  };

  const generateMakeoverGallery = async (baseIdentityImage, garmentImage, items) => {
    // We process sequentially to avoid OOM on local GPUs
    const results = [];
    for (const item of items) {
        try {
            const res = await generateSingleImage(baseIdentityImage, garmentImage, item.prompt, item.isHaircut);
            results.push(res);
        } catch (e) {
            console.error("Gallery item failed:", e);
            // Push placeholder or throw
            results.push("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="); // Transparent pixel
        }
    }
    return results;
  };

  const transformLook = async (wizardData, identityImage, garmentImage, style, instruction) => {
    const weatherContext = await fetchWeatherContext(wizardData);
    const prompt = `
You are updating a single existing outfit recommendation.

CURRENT LOOK JSON
${JSON.stringify(style, null, 2)}

EDIT INSTRUCTION
${instruction}

Return ONLY JSON for one updated style object with this shape:
{
  "id": "${style.id}",
  "title": "Look title",
  "description": "Updated description",
  ... (same fields as original) ...
}
`;

    const response = await fetch(`${textApiUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: textModel,
            messages: [{ role: 'user', content: prompt }],
            format: 'json',
            temperature: 0.7,
        }),
    });

    const result = await response.json();
    const text = result.choices[0].message.content;

    const parsed = extractJson(text);
    const nextStyle = normalizeStyleOption(parsed, 0, wizardData.findOutfits);
    
    let image;
    try {
        image = await generateSingleImage(identityImage, garmentImage, nextStyle.visualPrompt, false);
    } catch {
        image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    }

    return {
      style: nextStyle,
      image,
    };
  };

  const generateStyleSession = async (wizardData, isMore = false, existingLookTitles = []) => {
    const analysis = await analyzeStyleRequest(wizardData, isMore, existingLookTitles);
    const galleryItems = analysis.styles.map((style) => ({ prompt: style.visualPrompt, isHaircut: false }));
    if (analysis.haircut?.visualPrompt) {
      galleryItems.push({ prompt: analysis.haircut.visualPrompt, isHaircut: true });
    }

    const generatedImages = await generateMakeoverGallery(wizardData.userPhotos[0], wizardData.garmentImage, galleryItems);
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
    transformLook,
  };
};
