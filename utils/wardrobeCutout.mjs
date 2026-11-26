export function hasUsableCutoutSize(category, width, height) {
  const minimumShortEdge = category === 'accessories' || category === 'shoes' ? 16 : 32;
  if (Math.min(width, height) < minimumShortEdge || Math.max(width, height) < 64) return false;

  // A waistband or hem can be wide enough to pass the size check on its own.
  return (category !== 'bottoms' && category !== 'dresses') || height >= width * 0.35;
}
