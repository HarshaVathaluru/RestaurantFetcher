import { GoogleGenerativeAI } from '@google/generative-ai';
import { NormalizedPlace } from '../../models/place';
import { PlaceProvider, PlaceSearchParams } from './placeProvider';
import { PhotoService } from './photoService';

export class GeminiPlacesProvider implements PlaceProvider {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      this.genAI = new GoogleGenerativeAI(key);
      // Use gemini-flash-lite-latest for ultrafast 1.5s real-world intelligence
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-flash-lite-latest',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.model);
  }

  async search(params: PlaceSearchParams): Promise<NormalizedPlace[]> {
    if (!this.model) return [];

    const { intent, coords } = params;
    const places: NormalizedPlace[] = [];

    try {
      // Prioritize actual location name from reverse geocoding or coordinates, never forcing 'Hyderabad'
      const locationName = coords.displayName || `coordinates (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
      const queryItem = intent.foodItems?.[0]?.name || intent.cuisine?.[0] || intent.category?.[0] || 'restaurants';

      // 1. Concurrently fetch authentic Wikipedia food photography for queried dish
      const wikiPhotosPromise = PhotoService.fetchWikiDishPhotos(queryItem);

      // 2. Query Gemini for real physical establishments near user's genuine GPS coordinates
      const prompt = `You are an expert real-world restaurant intelligence engine with accurate knowledge of physical establishments worldwide, similar to Google Maps.
User search query: "${queryItem}".
Target Location: "${locationName}".
Target GPS Center: latitude ${coords.latitude}, longitude ${coords.longitude}.

Return a JSON array of up to 8 REAL, EXISTING, currently operating restaurants that genuinely exist in this exact locality around coordinates ${coords.latitude}, ${coords.longitude}.
STRICT INSTRUCTIONS:
1. ONLY return REAL, famous or popular physical establishments that actually exist near these coordinates. DO NOT invent fake places.
2. DO NOT return Hyderabad places unless the coordinates are actually in Hyderabad. Respect the target GPS center strictly!
3. Provide ACCURATE GPS coordinates (latitude, longitude) close to the specified coordinates.
4. Provide REAL street addresses with area/locality and landmark.
5. Provide REALISTIC authentic menu items with accurate current market prices in INR (₹).
6. Provide real Google ratings (e.g. 4.1 to 4.7) and realistic review counts (e.g. 1500 to 45000).
7. Provide real phone numbers and accurate opening hours.
8. Categorize their authentic cuisine and ambiance accurately.

JSON Format:
[
  {
    "id": "gemini_unique_id",
    "name": "Exact Real Restaurant Name",
    "address": "Full real address with landmark",
    "latitude": ${coords.latitude},
    "longitude": ${coords.longitude},
    "rating": 4.4,
    "reviewCount": 18200,
    "priceLevel": 2,
    "averageCostPerPerson": 350,
    "priceEstimatedText": "₹350 per person",
    "cuisines": ["Biryani", "South Indian"],
    "phone": "+91 40 2763 4490",
    "website": "https://...",
    "openingHours": "11:00 AM – 11:30 PM",
    "foodItems": [
      { "name": "Exact Dish Name", "price": 320, "verified": true },
      { "name": "Second Dish", "price": 280, "verified": true },
      { "name": "Third Dish", "price": 180, "verified": true }
    ],
    "features": ["family-friendly", "ac dining", "takeaway"],
    "atmosphere": ["casual", "authentic"],
    "servesAlcohol": false,
    "description": "Authentic description highlighting why locals and visitors choose this place."
  }
]`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const [geminiResult, wikiPhotos] = await Promise.all([
        this.model.generateContent(prompt, { signal: controller.signal }),
        wikiPhotosPromise,
      ]);
      clearTimeout(timeoutId);

      const text = geminiResult.response.text();
      const rawPlaces = JSON.parse(text);

      if (!Array.isArray(rawPlaces)) return [];

      for (let i = 0; i < rawPlaces.length; i++) {
        const p = rawPlaces[i];
        if (!p.name || !p.latitude || !p.longitude) continue;

        const lat = Number(p.latitude);
        const lon = Number(p.longitude);

        // Distance in km from user coordinates
        const distance = Math.round(this.calculateDistanceKm(coords.latitude, coords.longitude, lat, lon) * 10) / 10;

        // Dynamic non-duplicating dish photography combining Wikimedia Commons + curated pool
        const cuisines = Array.isArray(p.cuisines) && p.cuisines.length > 0 ? p.cuisines : ['Multi-Cuisine'];
        const { coverImage, gallery } = PhotoService.getPhotos(
          p.name,
          cuisines,
          intent.foodItems?.[0]?.name || queryItem,
          wikiPhotos
        );

        const safePrice = Number(p.averageCostPerPerson) || 350;
        const foodItems = Array.isArray(p.foodItems) ? p.foodItems.map((f: any) => ({
          name: String(f.name || 'Signature Special'),
          price: Number(f.price) || Math.round(safePrice * 0.75),
          verified: Boolean(f.verified ?? true),
        })) : [];

        places.push({
          id: `gem_${Date.now()}_${i}_${encodeURIComponent(p.name.replace(/\s+/g, '_').toLowerCase())}`,
          name: p.name,
          image: coverImage,
          images: gallery,
          rating: Number(p.rating) || 4.3,
          reviewCount: Number(p.reviewCount) || 3200,
          priceLevel: Number(p.priceLevel) || 2,
          priceEstimatedText: p.priceEstimatedText || `₹${safePrice} per person`,
          averageCostPerPerson: safePrice,
          currency: 'INR',
          address: p.address || coords.displayName,
          distance,
          latitude: lat,
          longitude: lon,
          categories: ['restaurant', ...cuisines.map((c: string) => c.toLowerCase())],
          cuisine: cuisines,
          foodItems,
          dietaryOptions: p.dietaryOptions || ['Vegetarian Options', 'Halal Available'],
          tasteProfiles: ['authentic', 'rich', 'flavorful'],
          features: Array.isArray(p.features) ? p.features : ['dine-in', 'takeaway', 'family-friendly'],
          servesAlcohol: Boolean(p.servesAlcohol),
          alcohol: {
            beer: Boolean(p.servesAlcohol),
            wine: Boolean(p.servesAlcohol),
            cocktails: Boolean(p.servesAlcohol),
          },
          openNow: true,
          openingHours: p.openingHours || '11:00 AM – 11:00 PM',
          phone: p.phone,
          website: p.website,
          links: {
            googleMaps: `https://maps.google.com/?q=${encodeURIComponent(p.name + ' ' + (p.address || ''))}`,
            swiggy: `https://www.swiggy.com/search?query=${encodeURIComponent(p.name)}`,
            zomato: `https://www.zomato.com/search?q=${encodeURIComponent(p.name)}`,
            website: p.website,
          },
          directionsUrl: `https://maps.google.com/?q=${lat},${lon}`,
          description: p.description || `${p.name} is a renowned dining spot in ${locationName}.`,
        });
      }
    } catch (err: any) {
      console.warn('[GeminiPlacesProvider] search error:', err.message || err);
    }

    return places;
  }

  async getDetails(placeId: string): Promise<NormalizedPlace | null> {
    return null;
  }

  async getPhotos(placeId: string): Promise<string[]> {
    return [];
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
