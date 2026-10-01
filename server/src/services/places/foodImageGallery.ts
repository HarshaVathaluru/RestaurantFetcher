import { PhotoService } from './photoService';

/**
 * Deterministically picks high-res, cuisine-matched photos based on restaurant name.
 * Uses PhotoService to guarantee distinct, genuine imagery per establishment.
 */
export function getDynamicFoodImages(
  name: string,
  cuisines: string[] = [],
  searchedDish?: string,
  liveWikiPhotos: string[] = []
): { coverImage: string; gallery: string[] } {
  return PhotoService.getPhotos(name, cuisines, searchedDish, liveWikiPhotos);
}
