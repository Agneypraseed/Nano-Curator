import sharp from 'sharp';
import { buildObjectPrompt, decodeMaskToRaster, formats, recordsOfKind } from '@meta-sam/parser';
import { imageDataUrl, imageParts } from './images.mjs';
import { hasUsableCutoutSize } from '../utils/wardrobeCutout.mjs';

export const SAM_MODEL = 'sam-3.1';
const categories = ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories', 'other'];
const maxPieces = 6;

const inventorySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      maxItems: maxPieces,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'category', 'description', 'searchQuery', 'left', 'top', 'right', 'bottom'],
        properties: {
          label: { type: 'string' },
          category: { type: 'string', enum: categories },
          description: { type: 'string' },
          searchQuery: { type: 'string' },
          left: { type: 'integer' },
          top: { type: 'integer' },
          right: { type: 'integer' },
          bottom: { type: 'integer' },
        },
      },
    },
  },
};

function toBox(item, { width, height }) {
  const values = [item.left, item.top, item.right, item.bottom];
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 1000)) return null;
  const [left, top, right, bottom] = values.map((value, index) => Math.round(value * (index % 2 ? height : width) / 1000));
  return right > left && bottom > top ? { left, top, right, bottom } : null;
}

function overlap(first, second) {
  const width = Math.min(first.right, second.right) - Math.max(first.left, second.left);
  const height = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
  if (width <= 0 || height <= 0) return 0;
  const intersection = width * height;
  const area = (box) => (box.right - box.left) * (box.bottom - box.top);
  return intersection / (area(first) + area(second) - intersection);
}

function sourceBounds(box, mask, { width, height }) {
  const left = Math.min(box.left, mask.left);
  const top = Math.min(box.top, mask.top);
  const right = Math.max(box.right, mask.right);
  const bottom = Math.max(box.bottom, mask.bottom);
  const marginX = (right - left) * 0.06;
  const marginY = (bottom - top) * 0.06;
  return {
    left: Math.max(0, (left - marginX) / width),
    top: Math.max(0, (top - marginY) / height),
    right: Math.min(1, (right + marginX) / width),
    bottom: Math.min(1, (bottom + marginY) / height),
  };
}

async function preparePhoto(sourceImage) {
  const bytes = Buffer.from(imageParts(sourceImage).data, 'base64');
  if (!bytes.length || bytes.length > 20 * 1024 * 1024) {
    throw new Error('Choose a readable outfit photo under 20 MB.');
  }
  try {
    return await sharp(bytes, { limitInputPixels: 48_000_000 })
      .autoOrient()
      .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 89 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new Error('The outfit photo could not be opened. Try a JPEG, PNG, or WebP image.');
  }
}

function decodeMasks(output) {
  const parser = formats.segmentation.image().createParser();
  parser.push(output, { emit: false });
  const { result } = parser.finish({ status: 'completed' });
  const masks = recordsOfKind(result.records, 'mask');
  if (masks.length === 0 && result.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    throw new Error('SAM returned an unreadable garment mask. Try the photo again.');
  }
  return masks;
}

async function applyMask(photo, record, category) {
  const { left, top, right, bottom } = record.bounds;
  const { width, height } = record.mask;
  if (width < 1 || height < 1 || right - left !== width || bottom - top !== height ||
      left < 0 || top < 0 || right > photo.info.width || bottom > photo.info.height) return null;

  const mask = decodeMaskToRaster(record.mask);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let visiblePixels = 0;
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    visiblePixels += 1;
  }
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  if (!hasUsableCutoutSize(category, cropWidth, cropHeight) || visiblePixels < cropWidth * cropHeight * 0.04) return null;

  const pixels = await sharp(photo.data)
    .extract({ left: left + minX, top: top + minY, width: cropWidth, height: cropHeight })
    .ensureAlpha()
    .raw()
    .toBuffer();
  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      pixels[(y * cropWidth + x) * 4 + 3] = mask[(y + minY) * width + x + minX] * 255;
    }
  }
  const cutout = await sharp(pixels, { raw: { width: cropWidth, height: cropHeight, channels: 4 } })
    .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  return {
    image: imageDataUrl(cutout.toString('base64')),
    bounds: { left: left + minX, top: top + minY, right: left + maxX + 1, bottom: top + maxY + 1 },
  };
}

export function createSamExtractor({ request, model, responseText }) {
  return async function extractWardrobeItems(sourceImage, targetGarment = '') {
    const photo = await preparePhoto(sourceImage);
    const inputImage = { type: 'input_image', image_url: imageDataUrl(photo.data.toString('base64')) };
    const target = targetGarment.trim().slice(0, 110);
    const segment = async (prompt) => {
      const response = await request({
        model: SAM_MODEL,
        metadata: { mask_encoding: 'one_bit' },
        input: [{ role: 'user', content: [inputImage, { type: 'input_text', text: prompt }] }],
      });
      return decodeMasks(responseText(response));
    };
    const inventoryRequest = request({
      model,
      text: { format: { type: 'json_schema', name: 'wardrobe_inventory', strict: true, schema: inventorySchema } },
      input: [{ role: 'user', content: [
        inputImage,
        { type: 'input_text', text: [
          'Inventory the clearly visible clothing in this photo, with at most six items. Exclude people, skin, hair, scenery, jewelry and tiny or heavily occluded items. Count a matching pair of shoes once. Use the most distinct visible piece first.',
          'Only include garments with enough of their shape visible to identify them. Skip a garment if only its waistband, hem, or another small fragment is in frame. Include glasses and other small accessories only when their overall shape is clear.',
          target ? 'Only include distinct pieces matching this requested garment: ' + JSON.stringify(target) : 'Include different garments and prominent accessories you can clearly see.',
          'For each item provide a short label, visible color, pattern and silhouette in description, and a concise product searchQuery. Mention material or brand only if directly visible with confidence.',
          'Give the tight enclosing rectangle of each whole visible piece, each coordinate expressed on the 0 to 1000 grid relative to the entire image: left, top, right, bottom. Include sleeves and hems. Keep coordinates in image bounds.',
        ].join('\n') },
      ] }],
    });
    const [inventoryResponse, targetedMasks] = await Promise.all([
      inventoryRequest,
      target ? segment(target).catch(() => []) : [],
    ]);
    let inventory;
    try {
      inventory = JSON.parse(responseText(inventoryResponse));
    } catch {
      throw new Error('Muse could not read the garment details. Try another outfit photo.');
    }
    const pieces = (Array.isArray(inventory.items) ? inventory.items : []).slice(0, maxPieces)
      .map((item) => ({ item, box: toBox(item, photo.info) }))
      .filter(({ box }) => box);

    if (pieces.length === 0) {
      throw new Error(target
        ? 'No visible garment matched that description. Try a shorter phrase such as “dress”.'
        : 'No visible garments were found. Try a brighter photo with the pieces in frame.');
    }

    // A dress can span several regions of an outfit. Its name gives SAM more
    // context than a box that may cover only the skirt or bodice.
    const conceptMasks = [...targetedMasks];
    if (!target && pieces.some(({ item }) => item.category === 'dresses')) {
      conceptMasks.push(...await segment('dress').catch(() => []));
    }
    const cutouts = new Map();
    const promptedByConcept = pieces.flatMap((piece, index) =>
      target || piece.item.category === 'dresses' ? [{ ...piece, index }] : []);
    for (const { index, item, box } of promptedByConcept) {
      const best = conceptMasks
        .map((mask, candidateIndex) => ({ candidateIndex, score: overlap(box, mask.bounds) }))
        .sort((first, second) => second.score - first.score)[0];
      if (best && (best.score >= 0.12 || (promptedByConcept.length === 1 && conceptMasks.length === 1))) {
        const [mask] = conceptMasks.splice(best.candidateIndex, 1);
        const cutout = await applyMask(photo, mask, item.category);
        if (cutout) cutouts.set(index, cutout);
      }
    }

    const remaining = pieces.flatMap(({ box }, index) => cutouts.has(index) ? [] : [{ id: index, prompts: [{ box }] }]);
    if (remaining.length) {
      const prompt = buildObjectPrompt({
        size: { width: photo.info.width, height: photo.info.height },
        objects: remaining,
      });
      try {
        for (const mask of await segment(prompt)) {
          const index = Number(mask.objectId);
          if (!pieces[index] || cutouts.has(index)) continue;
          const cutout = await applyMask(photo, mask, pieces[index].item.category);
          if (cutout) cutouts.set(index, cutout);
        }
      } catch (error) {
        if (cutouts.size === 0) throw error;
      }
    }
    if (cutouts.size === 0) throw new Error('SAM could not isolate a complete piece. Try a clearer photo with the whole garment in frame.');

    const sourcePreview = await sharp(photo.data)
      .resize({ width: 650, height: 650, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 76 })
      .toBuffer();
    const output = [];

    for (const [index, { item, box }] of pieces.entries()) {
      const cutout = cutouts.get(index);
      if (!cutout) continue;
      output.push({
        label: item.label.trim().slice(0, 90) || 'Wardrobe piece',
        category: categories.includes(item.category) ? item.category : 'other',
        description: item.description.trim().slice(0, 400),
        searchQuery: item.searchQuery.trim().slice(0, 180),
        image: cutout.image,
        sourceBounds: sourceBounds(box, cutout.bounds, photo.info),
        cutoutReady: true,
        cutoutQuality: 'usable',
        extractor: 'meta-sam',
      });
    }
    return { items: output, sourceImage: sourcePreview.toString('base64'), skippedCount: pieces.length - output.length };
  };
}
