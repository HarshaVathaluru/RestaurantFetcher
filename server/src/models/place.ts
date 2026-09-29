import { z } from 'zod';

export interface LocationIntent {
  type: 'nearby' | 'city' | 'destination' | 'address';
  query?: string;
  radius?: number; // in meters
  latitude?: number;
  longitude?: number;
}

export interface AlcoholRequirement {
  required: boolean;
  beer: boolean;
  wine: boolean;
  cocktails: boolean;
}

export interface RatingFilter {
  minimum: number;
}

export interface BudgetFilter {
  maximum?: number;
  currency?: string;
  tier?: 1 | 2 | 3 | 4; // 1 = budget (<500), 2 = moderate (500-1000), 3 = upscale (1000-2000), 4 = fine dining (2000+)
}

export interface SearchIntent {
  intent: 'restaurant_search';
  location: LocationIntent;
  category: string[]; // ['restaurant', 'cafe', 'bar', 'pub', 'bakery', etc.]
  cuisine: string[];
  foodPreferences: string[]; // ['spicy', 'authentic', 'light', 'sweet', 'rich', 'comfort']
  foodItems: Array<{ name: string; quantity?: string }>;
  dietary?: string[]; // ['vegetarian', 'vegan', 'halal', 'gluten-free']
  rating?: RatingFilter;
  budget?: BudgetFilter;
  audience: string[]; // ['family', 'couples', 'friends', 'business', 'solo']
  atmosphere: string[]; // ['romantic', 'rooftop', 'quiet', 'luxury', 'casual', 'outdoor', 'party']
  features: string[]; // ['outdoor seating', 'live music', 'wifi', 'parking', 'ac', 'pet friendly']
  entertainment?: string[]; // ['live music', 'dj', 'sports screening', 'karaoke']
  alcohol: AlcoholRequirement;
  openNow: boolean;
  sort: 'relevance' | 'rating' | 'distance' | 'price';
  resultCount: number;
}

export interface NormalizedPlace {
  id: string;
  name: string;
  image: string;
  images: string[];
  rating: number;
  reviewCount: number;
  priceLevel: number; // 1-4
  priceEstimatedText: string; // e.g. "₹400 for two", "₹900 per person"
  averageCostPerPerson: number;
  currency: string;
  address: string;
  distance?: number; // in km
  latitude: number;
  longitude: number;
  categories: string[];
  cuisine: string[];
  foodItems?: Array<{
    name: string;
    price?: number;
    verified: boolean;
    variations?: Array<{ name: string; price: number }>;
  }>;
  dietaryOptions: string[];
  tasteProfiles: string[];
  features: string[];
  servesAlcohol: boolean;
  alcohol: {
    beer: boolean;
    wine: boolean;
    cocktails: boolean;
  };
  openNow: boolean;
  openingHours?: string;
  website?: string;
  phone?: string;
  links?: {
    swiggy?: string;
    zomato?: string;
    magicpin?: string;
    eatsure?: string;
    website?: string;
    googleMaps: string;
  };
  directionsUrl?: string;
  deliveryComparison?: {
    swiggy?: {
      platform: 'swiggy';
      platformName?: string;
      itemPrice: number;
      deliveryFee: number;
      discount: number;
      finalEstimate: number;
      deliveryTime: string;
      offerText: string;
      url?: string;
      isBestPrice?: boolean;
    };
    zomato?: {
      platform: 'zomato';
      platformName?: string;
      itemPrice: number;
      deliveryFee: number;
      discount: number;
      finalEstimate: number;
      deliveryTime: string;
      offerText: string;
      url?: string;
      isBestPrice?: boolean;
    };
    magicpin?: {
      platform: 'magicpin';
      platformName?: string;
      itemPrice: number;
      deliveryFee: number;
      discount: number;
      finalEstimate: number;
      deliveryTime: string;
      offerText: string;
      url?: string;
      isBestPrice?: boolean;
    };
    eatsure?: {
      platform: 'eatsure';
      platformName?: string;
      itemPrice: number;
      deliveryFee: number;
      discount: number;
      finalEstimate: number;
      deliveryTime: string;
      offerText: string;
      url?: string;
      isBestPrice?: boolean;
    };
    options?: Array<{
      platform: string;
      platformName: string;
      itemPrice: number;
      deliveryFee: number;
      discount: number;
      finalEstimate: number;
      deliveryTime: string;
      offerText: string;
      url?: string;
      isBestPrice?: boolean;
    }>;
    bestPlatform?: string;
    priceDifferenceText?: string;
  };
  tableBooking?: {
    available: boolean;
    slots: Array<{
      time: string;
      available: boolean;
      status: 'available' | 'limited' | 'full';
    }>;
    provider?: string;
    directReservationUrl?: string;
  };
  travelTime?: {
    drivingMinutes: number;
    walkingMinutes: number;
  };
  description?: string;
  reviews?: Array<{
    author: string;
    rating: number;
    text: string;
    date: string;
  }>;
  matchScore?: number;
  matchEvidence?: string[];
  matchedFoodItems?: Array<{ name: string; price?: number }>;
}

export const SearchIntentSchema = z.object({
  intent: z.literal('restaurant_search').default('restaurant_search'),
  location: z.object({
    type: z.enum(['nearby', 'city', 'destination', 'address']).default('nearby'),
    query: z.string().optional(),
    radius: z.number().optional().default(5000),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  category: z.array(z.string()).default(['restaurant']),
  cuisine: z.array(z.string()).default([]),
  foodPreferences: z.array(z.string()).default([]),
  foodItems: z.array(
    z.object({
      name: z.string(),
      quantity: z.string().optional(),
    })
  ).default([]),
  dietary: z.array(z.string()).optional().default([]),
  rating: z.object({
    minimum: z.number().min(0).max(5).default(0),
  }).optional(),
  budget: z.object({
    maximum: z.number().optional(),
    currency: z.string().default('INR'),
    tier: z.number().min(1).max(4).optional(),
  }).optional(),
  audience: z.array(z.string()).default([]),
  atmosphere: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  entertainment: z.array(z.string()).optional().default([]),
  alcohol: z.object({
    required: z.boolean().default(false),
    beer: z.boolean().default(false),
    wine: z.boolean().default(false),
    cocktails: z.boolean().default(false),
  }).default({
    required: false,
    beer: false,
    wine: false,
    cocktails: false,
  }),
  openNow: z.boolean().default(false),
  sort: z.enum(['relevance', 'rating', 'distance', 'price']).default('relevance'),
  resultCount: z.number().default(10),
});
