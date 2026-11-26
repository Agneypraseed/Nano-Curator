export function imageParts(value) {
  const match = typeof value === 'string' && value.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
  if (match) return { data: match[2], mimeType: match[1] };
  const data = value || '';
  let mimeType = 'image/jpeg';
  if (data.startsWith('iVBOR')) mimeType = 'image/png';
  if (data.startsWith('UklGR')) mimeType = 'image/webp';
  if (data.startsWith('R0lGOD')) mimeType = 'image/gif';
  return { data, mimeType };
}

export function imageDataUrl(value) {
  const { data, mimeType } = imageParts(value);
  return 'data:' + mimeType + ';base64,' + data;
}
