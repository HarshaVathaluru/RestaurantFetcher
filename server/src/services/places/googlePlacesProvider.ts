import { NormalizedPlace, SearchIntent } from '../../models/place';
import { LocationResolver, ResolvedCoordinates } from '../location/locationResolver';
import { PlaceClassifier } from './placeClassifier';
import { PlaceProvider, PlaceSearchParams } from './placeProvider';

export class GooglePlacesProvider implements PlaceProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_PLACES_API_KEY || '';
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  async search(params: PlaceSearchParams): Promise<NormalizedPlace[]> {
    if (!this.isConfigured) {
      return [];
    }

    const { intent, coords } = params;
    const radiusMeters = intent.location?.radius || coords.radiusMeters || 5000;

    // Build the query text for Google Places
    let textQuery = '';
    const foodKeywords = intent.foodItems?.map(f => f.name).join(' ') || '';
    const cuisineKeywords = intent.cuisine?.join(' ') || '';
    const categoryKeywords = intent.category?.filter(c => c !== 'restaurant').join(' ') || '';

    const searchAspects = [foodKeywords, cuisineKeywords, categoryKeywords].filter(Boolean).join(' ').trim();

    if (searchAspects) {
      textQuery = `${searchAspects} in ${coords.displayName.split(',')[0].trim()}`;
    } else {
      textQuery = `best restaurants in ${coords.displayName.split(',')[0].trim()}`;
    }

    try {
      const fieldMask = [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.types',
        'places.nationalPhoneNumber',
        'places.internationalPhoneNumber',
        'places.websiteUri',
        'places.googleMapsUri',
        'places.regularOpeningHours',
        'places.photos',
        'places.reviews',
        'places.servesBeer',
        'places.servesWine',
        'places.servesCocktails',
        'places.servesVegetarianFood',
        'places.editorialSummary',
      ].join(',');

      const requestBody: any = {
        textQuery,
        maxResultCount: 20,
      };

      if (coords.latitude && coords.longitude) {
        requestBody.locationBias = {
          circle: {
            center: {
              latitude: coords.latitude,
              longitude: coords.longitude,
            },
            radius: Math.min(radiusMeters, 50000),
          },
        };
      }

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Google Places API error (${response.status}):`, errorText);
        return [];
      }

      const data: any = await response.json();
      if (!data.places || !Array.isArray(data.places)) {
        return [];
      }

      return data.places.map((place: any) => this.transformGooglePlace(place, coords));
    } catch (err) {
      console.error('Google Places search exception:', err);
      return [];
    }
  }

  async getDetails(placeId: string): Promise<NormalizedPlace | null> {
    if (!this.isConfigured) return null;

    try {
      const fieldMask = [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'priceLevel',
        'types',
        'nationalPhoneNumber',
        'internationalPhoneNumber',
        'websiteUri',
        'googleMapsUri',
        'regularOpeningHours',
        'photos',
        'reviews',
        'servesBeer',
        'servesWine',
        'servesCocktails',
        'servesVegetarianFood',
        'editorialSummary',
      ].join(',');

      const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
      });

      if (!res.ok) return null;
      const place = await res.json();
      return this.transformGooglePlace(place);
    } catch {
      return null;
    }
  }

  async getPhotos(placeId: string): Promise<string[]> {
    const details = await this.getDetails(placeId);
    return details ? details.images : [];
  }

  /**
   * Transforms official Google Places v1 entity into NormalizedPlace schema
   */
  private transformGooglePlace(place: any, userCoords?: ResolvedCoordinates): NormalizedPlace {
    const name = place.displayName?.text || 'Restaurant';
    const lat = place.location?.latitude || 0;
    const lon = place.location?.longitude || 0;
    const address = place.formattedAddress || '';

    // Distance calculation from search/GPS coordinates
    const distance = userCoords
      ? LocationResolver.calculateDistanceKm(userCoords.latitude, userCoords.longitude, lat, lon)
      : undefined;

    // Photos: Convert Google photo references to high-res media URLs
    const photos: string[] = [];
    if (Array.isArray(place.photos)) {
      for (const photo of place.photos.slice(0, 5)) {
        if (photo.name) {
          photos.push(`https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=1200&key=${this.apiKey}`);
        }
      }
    }

    const fallbackImage = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80';
    const mainImage = photos[0] || fallbackImage;

    // Price Level mapping
    let priceLevel = 2;
    let avgCost = 500;
    let priceText = '₹500 per person';

    if (place.priceLevel === 'PRICE_LEVEL_INEXPENSIVE') {
      priceLevel = 1;
      avgCost = 250;
      priceText = '₹250 per person';
    } else if (place.priceLevel === 'PRICE_LEVEL_MODERATE') {
      priceLevel = 2;
      avgCost = 600;
      priceText = '₹600 per person';
    } else if (place.priceLevel === 'PRICE_LEVEL_EXPENSIVE') {
      priceLevel = 3;
      avgCost = 1200;
      priceText = '₹1,200 per person';
    } else if (place.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE') {
      priceLevel = 4;
      avgCost = 2500;
      priceText = '₹2,500+ per person';
    }

    // Google Reviews
    const reviews = Array.isArray(place.reviews)
      ? place.reviews.slice(0, 3).map((r: any) => ({
          author: r.authorAttribution?.displayName || 'Diner',
          rating: r.rating || 5,
          text: r.text?.text || r.originalText?.text || 'Great dining experience.',
          date: r.relativePublishTimeDescription || 'recently',
        }))
      : [];

    // Alcohol
    const servesBeer = Boolean(place.servesBeer);
    const servesWine = Boolean(place.servesWine);
    const servesCocktails = Boolean(place.servesCocktails);
    const servesAlcohol = servesBeer || servesWine || servesCocktails;

    // Classify cuisines & food items
    const profile = PlaceClassifier.classify(name, address, { types: place.types || [] });

    // Opening Hours
    const openNow = Boolean(place.regularOpeningHours?.openNow ?? true);
    const openingHours = place.regularOpeningHours?.weekdayDescriptions?.[0] || '11:00 AM – 11:00 PM';

    return {
      id: `google_${place.id || Math.random().toString(36).substring(2, 9)}`,
      name,
      image: mainImage,
      images: photos.length > 0 ? photos : [fallbackImage],
      rating: parseFloat((place.rating || 4.2).toFixed(1)),
      reviewCount: place.userRatingCount || 100,
      priceLevel,
      priceEstimatedText: priceText,
      averageCostPerPerson: avgCost,
      currency: 'INR',
      address,
      distance,
      latitude: lat,
      longitude: lon,
      categories: profile.categories,
      cuisine: profile.cuisine,
      foodItems: profile.foodItems,
      dietaryOptions: place.servesVegetarianFood ? ['vegetarian', ...profile.dietaryOptions] : profile.dietaryOptions,
      tasteProfiles: profile.tasteProfiles,
      features: profile.features,
      servesAlcohol,
      alcohol: {
        beer: servesBeer,
        wine: servesWine,
        cocktails: servesCocktails,
      },
      openNow,
      openingHours,
      website: place.websiteUri,
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber,
      links: {
        googleMaps: place.googleMapsUri || `https://maps.google.com/?q=${encodeURIComponent(name + ' ' + address)}`,
        swiggy: `https://www.swiggy.com/search?query=${encodeURIComponent(name)}`,
        zomato: `https://www.zomato.com/search?q=${encodeURIComponent(name)}`,
        website: place.websiteUri,
      },
      directionsUrl: place.googleMapsUri || `https://maps.google.com/?q=${lat},${lon}`,
      description: place.editorialSummary?.text || `${name} in ${address}`,
      reviews,
    };
  }
}
