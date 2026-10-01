export interface LocationIntent {
  type: 'nearby' | 'city' | 'destination' | 'address';
  query?: string;
  radius?: number;
  latitude?: number;
  longitude?: number;
}

export interface SearchIntent {
  intent: 'restaurant_search';
  location: LocationIntent;
  category: string[];
  cuisine: string[];
  foodPreferences: string[];
  dietary?: string[];
  rating?: { minimum: number };
  budget?: { maximum?: number; currency?: string; tier?: number };
  audience: string[];
  atmosphere: string[];
  features: string[];
  entertainment?: string[];
  alcohol: {
    required: boolean;
    beer: boolean;
    wine: boolean;
    cocktails: boolean;
  };
  openNow: boolean;
  sort: 'relevance' | 'rating' | 'distance' | 'price';
  foodItems?: Array<{ name: string; quantity?: string }>;
  resultCount?: number;
}

export interface ReviewItem {
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface NormalizedPlace {
  id: string;
  name: string;
  image: string;
  images: string[];
  rating: number;
  reviewCount: number;
  priceLevel: number;
  priceEstimatedText: string;
  averageCostPerPerson: number;
  currency: string;
  currencySymbol?: string;
  address: string;
  distance?: number;
  latitude: number;
  longitude: number;
  categories: string[];
  cuisine: string[];
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
  directionsUrl?: string;
  description?: string;
  reviews?: ReviewItem[];
  matchScore?: number;
  matchEvidence?: string[];
  foodItems?: Array<{
    name: string;
    price?: number;
    verified: boolean;
    variations?: Array<{ name: string; price: number }>;
  }>;
  links?: {
    swiggy?: string;
    zomato?: string;
    magicpin?: string;
    eatsure?: string;
    ubereats?: string;
    doordash?: string;
    grubhub?: string;
    deliveroo?: string;
    justeat?: string;
    talabat?: string;
    grabfood?: string;
    foodpanda?: string;
    website?: string;
    googleMaps: string;
    [key: string]: string | undefined;
  };
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
}

export interface CurrentUserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'gps';
}

export interface SearchLocation {
  name: string;
  latitude: number;
  longitude: number;
  source: 'user-selected' | 'detected';
}

export interface SearchResponse {
  requestId?: string;
  query: string;
  intent: SearchIntent;
  resolvedLocation: {
    latitude: number;
    longitude: number;
    displayName: string;
    radiusMeters: number;
    isCityLevel: boolean;
  };
  total: number;
  places: NormalizedPlace[];
  debug?: {
    requestId: string;
    rawCount: number;
    invalidRemoved: number;
    duplicatesRemoved: number;
    validatedCount: number;
    exactFoodMatches: number;
    searchLocation: string;
    radiusMeters: number;
  };
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  resultsCount: number;
}
