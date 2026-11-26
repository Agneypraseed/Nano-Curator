export function imageSource(image: string) {
  return image.startsWith('data:') ? image : 'data:image/jpeg;base64,' + image;
}
