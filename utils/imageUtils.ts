const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&h=1920&fit=crop&q=80'; // A generic, high-quality tech-related image

export const preloadImages = (urls: string[]): Promise<string[]> => {
  const promises = urls.map(url => {
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => resolve(url);
      img.onerror = () => {
        console.warn(`Failed to load image: ${url}. Using a fallback image.`);
        resolve(FALLBACK_IMAGE_URL);
      };
    });
  });
  return Promise.all(promises);
};
