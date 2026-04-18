import { GoogleGenAI } from "@google/genai";
import { StyleAnalysis, WizardState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";

/**
 * Step 1: Analyze user photos and generate style plans.
 * @param isMore If true, generates additional styles without re-analyzing core attributes or haircut.
 */
export const analyzeStyleRequest = async (data: WizardState, isMore: boolean = false): Promise<StyleAnalysis> => {
  const parts: any[] = [];

  // Add User Photos
  data.userPhotos.forEach((photo) => {
    parts.push({
      inlineData: { data: photo, mimeType: "image/jpeg" }
    });
  });

  // Add Reference Image if exists
  if (data.referenceImage) {
    parts.push({
      inlineData: { data: data.referenceImage, mimeType: "image/jpeg" }
    });
    parts.push({ text: "The image above is a REFERENCE STYLE image. The user wants to wear THIS EXACT OUTFIT or a very close variation of it." });
  }

  // Build the text prompt
  let promptText = `
    You are an elite high-fashion personal stylist, Personal Brand Consultant, and Sustainable Fashion Advisor.
    
    TASK:
    1. Analyze the USER photos (the first ${data.userPhotos.length} images) for body type, skin tone, and face shape.
    2. DESIGN 3 ${isMore ? "NEW and DISTINCT" : ""} LOOKS based strictly on the user's request, professional context, and lifestyle needs.
    3. Generate a Personal Brand Report and Sustainable Advice.
    
    CRITICAL INSTRUCTION FOR STYLE GENERATION:
    ${data.referenceImage 
      ? "The user provided a REFERENCE IMAGE. You MUST generate 3 variations of THAT SPECIFIC OUTFIT from the reference image. Do not ignore the reference." 
      : `The user's primary goal/occasion is: "${data.goals}". Their lifestyle/specific needs are: "${data.lifestyle}". You MUST follow this description precisely.`
    }

    ${data.includeHaircut && !isMore ? "The user also wants a new hairstyle suggestion." : "Do not provide a new haircut suggestion this time, focus only on outfits."}
    
    Output a JSON object with:
    - 'faceShape': The user's face shape.
    - 'skinTone': The user's skin tone.
    - 'bodyType': The user's body type analysis.
    
    - 'personalBrand': An object for the Personal Brand Consultant report:
        - 'archetype': A 2-3 word title for their new style persona (e.g., "The Modern Visionary").
        - 'industryInsights': An array of 3 strings. Each string must be a SHORT, punchy bullet point (max 12 words) about current trends relevant to them.
        - 'transformationStrategy': An array of 3 strings. Each string must be a specific, actionable goal (max 12 words).
        - 'bodyAnalysis': An array of 3 strings. Concise reasons why these cuts work for their specific body/face (max 15 words).

    - 'sustainableAdvice': An object for the Sustainable Fashion Advisor report:
        - 'wardrobeOptimization': An array of 3 strings. Short advice on mixing these items with staples (max 15 words).
        - 'versatilityGuide': An array of 3 strings. How to transition these looks (e.g. "Day to Night", "Office to Bar").

    - 'styles': An array of exactly 3 style options.
      Each item in 'styles' must have:
      - 'title': Short, high-fashion name.
      - 'description': A short, elegant editorial description of the look.
      - 'reasoning': Why this fits the user's body type, goals, and lifestyle.
      - 'visualPrompt': A highly descriptive prompt for an image generator. 
         IMPORTANT: 
         * For Style 1, this prompt MUST describe a FRONT VIEW of the user wearing the outfit.
         * For Style 2, this prompt MUST describe a SIDE PROFILE VIEW of the user wearing the outfit.
         * For Style 3, this prompt MUST describe a BACK/REAR VIEW of the user wearing the outfit.
         * For all prompts, specify "single full body shot" and a "clean neutral studio background". Do NOT ask for collages, triptychs, or multiple views in one image.
    
    ${data.includeHaircut && !isMore ? 
      `- 'haircut': An object with details about the suggested haircut:
          - 'styleName': Name of the haircut.
          - 'description': Detailed description.
          - 'visualPrompt': A prompt focused on a cinematic close-up head-and-shoulders portrait of the USER with this new haircut. Ensure the entire hairstyle is visible. High resolution, sharp focus on hair texture.` 
      : ""}

    ${data.findOutfits ? "Also use Google Search to find specific buyable products matching these looks. You MUST populate the 'shoppingList' in the JSON response with the best items found." : ""}
    
    ${data.findOutfits ? `- 'shoppingList': An array of objects representing the found products. Each object must have:
      - 'name': The actual product name from the store (e.g. 'Faux Leather Midi Dress'). NEVER use 'vertexaisearch' or a URL as the name.
      - 'brand': The brand or store name (e.g. 'Zara', 'Fashion Nova').
      - 'url': The direct URL to the product.` : ""}
  `;

  parts.push({ text: promptText });

  const tools = data.findOutfits ? [{ googleSearch: {} }] : [];

  const config: any = {
    tools: tools,
  };
  
  if (!data.findOutfits) {
    config.responseMimeType = "application/json";
  }

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: { parts },
    config: config,
  });

  const text = response.text;
  if (!text) throw new Error("No analysis returned.");

  const cleanJson = text.replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse JSON", cleanJson);
    throw new Error("Failed to generate valid analysis.");
  }

  // Safety: Ensure new fields are arrays if model returns string by mistake
  const ensureArray = (val: any) => Array.isArray(val) ? val : (val ? [val] : []);

  if (parsed.personalBrand) {
    parsed.personalBrand.industryInsights = ensureArray(parsed.personalBrand.industryInsights);
    parsed.personalBrand.transformationStrategy = ensureArray(parsed.personalBrand.transformationStrategy);
    parsed.personalBrand.bodyAnalysis = ensureArray(parsed.personalBrand.bodyAnalysis);
  }

  if (parsed.sustainableAdvice) {
    parsed.sustainableAdvice.wardrobeOptimization = ensureArray(parsed.sustainableAdvice.wardrobeOptimization);
    parsed.sustainableAdvice.versatilityGuide = ensureArray(parsed.sustainableAdvice.versatilityGuide);
  }

  let shoppingList = parsed.shoppingList || [];

  // Fallback for shopping list
  if (shoppingList.length === 0 && data.findOutfits && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
     const chunks = response.candidates[0].groundingMetadata.groundingChunks;
     chunks.forEach((chunk: any) => {
      if (chunk.web?.uri && chunk.web?.title) {
        let name = chunk.web.title;
        if (name.includes('vertexaisearch') || name.includes('http')) {
           try {
             const path = new URL(chunk.web.uri).pathname;
             const possibleName = path.split('/').pop()?.replace(/-/g, ' ');
             if (possibleName) name = possibleName;
           } catch(e) {
             name = "Stylish Item";
           }
        }

        shoppingList.push({ 
            name: name,
            brand: new URL(chunk.web.uri).hostname.replace('www.',''),
            url: chunk.web.uri 
        });
      }
    });
  }

  return {
    faceShape: parsed.faceShape || "Not specified",
    skinTone: parsed.skinTone || "Not specified",
    bodyType: parsed.bodyType || "Not specified",
    personalBrand: parsed.personalBrand,
    sustainableAdvice: parsed.sustainableAdvice,
    styles: parsed.styles || [],
    haircut: parsed.haircut,
    shoppingList: shoppingList.length > 0 ? shoppingList : undefined,
  };
};

/**
 * Step 2: Generate a single image (Internal helper)
 */
const generateSingleImage = async (baseIdentityImage: string, visualPrompt: string, isHaircut: boolean): Promise<string> => {
  // Customize the framing based on the type of generation
  const framingPrompt = isHaircut 
    ? "Cinematic close-up head and shoulders portrait, sharp focus on hair details" 
    : "High fashion photography, single full body shot";

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            data: baseIdentityImage,
            mimeType: "image/jpeg",
          },
        },
        {
          text: `${framingPrompt}. ${visualPrompt}. Maintain strict facial identity of the source image.`,
        },
      ],
    },
    config: {
        imageConfig: {
            aspectRatio: "3:4" 
        }
    }
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("No image generated.");
};

/**
 * Step 2 Wrapper: Generate multiple images in parallel
 */
export const generateMakeoverGallery = async (
  baseIdentityImage: string, 
  items: { prompt: string, isHaircut: boolean }[]
): Promise<string[]> => {
  const promises = items.map(item => generateSingleImage(baseIdentityImage, item.prompt, item.isHaircut));
  const results = await Promise.all(promises);
  return results;
};