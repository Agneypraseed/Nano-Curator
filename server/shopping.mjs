export const createShoppingService = (config = {}) => {
  const { imgbbApiKey, serpApiKey } = config;

  const uploadToImgBB = async (base64Image) => {
    if (!imgbbApiKey) throw new Error('Missing IMGBB_API_KEY in .env.local. Please add it to use Visual Search.');
    
    const formData = new URLSearchParams();
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    formData.append('image', base64Data);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ImgBB upload failed: ${text}`);
    }

    const data = await response.json();
    return data.data.url;
  };

  const searchGoogleLens = async (imageUrl) => {
    if (!serpApiKey) throw new Error('Missing SERPAPI_API_KEY in .env.local. Please add it to use Visual Search.');

    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.append('engine', 'google_lens');
    url.searchParams.append('url', imageUrl);
    url.searchParams.append('hl', 'en');
    url.searchParams.append('api_key', serpApiKey);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SerpApi failed: ${text}`);
    }

    const data = await response.json();
    return data.visual_matches || [];
  };

  const findShoppingLinks = async (base64Image) => {
    // 1. Upload the generated local image to a public URL so Google Lens can access it
    const imageUrl = await uploadToImgBB(base64Image);
    
    // 2. Perform the Reverse Image Search via SerpApi (Google Lens)
    const matches = await searchGoogleLens(imageUrl);

    // 3. Extract the top 6 matches and map them to our ShoppingItem format
    const results = matches.slice(0, 6).map((match) => ({
      name: match.title || 'Visually matched item',
      brand: match.source || 'Online Retailer',
      url: match.link || imageUrl,
      priceNote: match.price ? `${match.price.extracted_value} ${match.price.currency}` : '',
      thumbnail: match.thumbnail || '',
      reason: 'Matched via Google Lens visual search.',
      alternatives: [],
    }));

    return results;
  };

  return { findShoppingLinks };
};
