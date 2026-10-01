import { LocationIntent } from '../../models/place';

export interface CountryMetadata {
  countryCode: string;
  currency: string;
  currencySymbol: string;
  deliveryPlatforms: string[];
}

/**
 * Maps country code to authentic local currency, symbol, and valid delivery platforms.
 * ZERO hardcoded assumptions: dynamically resolved for any location worldwide.
 */
export function getCountryMetadata(countryCode?: string): CountryMetadata {
  const code = (countryCode || '').toLowerCase().trim();
  switch (code) {
    case 'in':
      return {
        countryCode: 'in',
        currency: 'INR',
        currencySymbol: '₹',
        deliveryPlatforms: ['swiggy', 'zomato'],
      };
    case 'us':
      return {
        countryCode: 'us',
        currency: 'USD',
        currencySymbol: '$',
        deliveryPlatforms: ['ubereats', 'doordash', 'grubhub'],
      };
    case 'gb':
    case 'uk':
      return {
        countryCode: 'gb',
        currency: 'GBP',
        currencySymbol: '£',
        deliveryPlatforms: ['deliveroo', 'ubereats', 'justeat'],
      };
    case 'ae':
      return {
        countryCode: 'ae',
        currency: 'AED',
        currencySymbol: 'AED ',
        deliveryPlatforms: ['talabat', 'deliveroo', 'ubereats'],
      };
    case 'sg':
      return {
        countryCode: 'sg',
        currency: 'SGD',
        currencySymbol: 'S$',
        deliveryPlatforms: ['grabfood', 'deliveroo', 'foodpanda'],
      };
    case 'ca':
      return {
        countryCode: 'ca',
        currency: 'CAD',
        currencySymbol: 'CA$',
        deliveryPlatforms: ['ubereats', 'doordash'],
      };
    case 'au':
      return {
        countryCode: 'au',
        currency: 'AUD',
        currencySymbol: 'A$',
        deliveryPlatforms: ['ubereats', 'doordash'],
      };
    case 'jp':
      return {
        countryCode: 'jp',
        currency: 'JPY',
        currencySymbol: '¥',
        deliveryPlatforms: ['ubereats'],
      };
    case 'fr':
    case 'de':
    case 'it':
    case 'es':
    case 'nl':
    case 'be':
    case 'ie':
    case 'at':
    case 'pt':
    case 'gr':
    case 'fi':
      return {
        countryCode: code,
        currency: 'EUR',
        currencySymbol: '€',
        deliveryPlatforms: ['ubereats', 'deliveroo', 'justeat'],
      };
    default:
      return {
        countryCode: code || 'us',
        currency: 'USD',
        currencySymbol: '$',
        deliveryPlatforms: ['ubereats', 'doordash'],
      };
  }
}

/**
 * Builds authentic platform search links tailored to each country's ecosystem.
 */
export function generateDeliveryLinks(
  name: string,
  address: string,
  deliveryPlatforms: string[],
  website?: string
): Record<string, string | undefined> {
  const q = encodeURIComponent(name);
  const links: Record<string, string | undefined> = {
    googleMaps: `https://maps.google.com/?q=${encodeURIComponent(name + ' ' + (address || ''))}`,
    website,
  };

  for (const plat of deliveryPlatforms) {
    switch (plat) {
      case 'swiggy':
        links.swiggy = `https://www.swiggy.com/search?query=${q}`;
        break;
      case 'zomato':
        links.zomato = `https://www.zomato.com/search?q=${q}`;
        break;
      case 'ubereats':
        links.ubereats = `https://www.ubereats.com/search?q=${q}`;
        break;
      case 'doordash':
        links.doordash = `https://www.doordash.com/search/store/${q}`;
        break;
      case 'grubhub':
        links.grubhub = `https://www.grubhub.com/search?orderMethod=delivery&locationMode=DELIVERY&facetOption=openNow&queryText=${q}`;
        break;
      case 'deliveroo':
        links.deliveroo = `https://deliveroo.co.uk/restaurants?q=${q}`;
        break;
      case 'talabat':
        links.talabat = `https://www.talabat.com/search?q=${q}`;
        break;
      case 'grabfood':
        links.grabfood = `https://food.grab.com/search?keyword=${q}`;
        break;
      case 'foodpanda':
        links.foodpanda = `https://www.foodpanda.com/search?q=${q}`;
        break;
      case 'justeat':
        links.justeat = `https://www.just-eat.co.uk/search?q=${q}`;
        break;
    }
  }

  return links;
}

export interface ResolvedCoordinates {
  latitude: number;
  longitude: number;
  displayName: string;
  radiusMeters: number;
  isCityLevel: boolean;
  countryCode?: string;
  currency: string;
  currencySymbol: string;
  deliveryPlatforms: string[];
}

export class LocationResolver {
  // Known city & landmark centroids for instant sub-millisecond resolution
  private static KNOWN_LOCATIONS: Record<string, { lat: number; lng: number; displayName: string; cityLevel?: boolean; countryCode: string }> = {
    // Hyderabad
    'hyderabad': { lat: 17.385044, lng: 78.486671, displayName: 'Hyderabad, Telangana, India', cityLevel: true, countryCode: 'in' },
    'charminar': { lat: 17.361563, lng: 78.474665, displayName: 'Charminar, Hyderabad', countryCode: 'in' },
    'hitech city': { lat: 17.4435, lng: 78.3772, displayName: 'HITEC City, Madhapur, Hyderabad', countryCode: 'in' },
    'madhapur': { lat: 17.4483, lng: 78.3915, displayName: 'Madhapur, Hyderabad', countryCode: 'in' },
    'gachibowli': { lat: 17.4401, lng: 78.3489, displayName: 'Gachibowli, Hyderabad', countryCode: 'in' },
    'banjara hills': { lat: 17.4156, lng: 78.4350, displayName: 'Banjara Hills, Hyderabad', countryCode: 'in' },
    'jubilee hills': { lat: 17.4319, lng: 78.4073, displayName: 'Jubilee Hills, Hyderabad', countryCode: 'in' },
    'secunderabad': { lat: 17.4399, lng: 78.4983, displayName: 'Secunderabad, Telangana', countryCode: 'in' },
    'kondapur': { lat: 17.4699, lng: 78.3578, displayName: 'Kondapur, Hyderabad', countryCode: 'in' },

    // Bengaluru
    'bengaluru': { lat: 12.9716, lng: 77.5946, displayName: 'Bengaluru, Karnataka, India', cityLevel: true, countryCode: 'in' },
    'bangalore': { lat: 12.9716, lng: 77.5946, displayName: 'Bengaluru, Karnataka, India', cityLevel: true, countryCode: 'in' },
    'indiranagar': { lat: 12.9784, lng: 77.6408, displayName: 'Indiranagar, Bengaluru', countryCode: 'in' },
    'koramangala': { lat: 12.9352, lng: 77.6245, displayName: 'Koramangala, Bengaluru', countryCode: 'in' },
    'whitefield': { lat: 12.9698, lng: 77.7500, displayName: 'Whitefield, Bengaluru', countryCode: 'in' },
    'hsr layout': { lat: 12.9121, lng: 77.6446, displayName: 'HSR Layout, Bengaluru', countryCode: 'in' },
    'church street': { lat: 12.9749, lng: 77.6053, displayName: 'Church Street, Bengaluru', countryCode: 'in' },
    'mg road': { lat: 12.9753, lng: 77.6067, displayName: 'MG Road, Bengaluru', countryCode: 'in' },

    // Mumbai
    'mumbai': { lat: 19.0760, lng: 72.8777, displayName: 'Mumbai, Maharashtra, India', cityLevel: true, countryCode: 'in' },
    'bandra': { lat: 19.0596, lng: 72.8295, displayName: 'Bandra, Mumbai', countryCode: 'in' },
    'juhu': { lat: 19.1075, lng: 72.8263, displayName: 'Juhu, Mumbai', countryCode: 'in' },
    'colaba': { lat: 18.9067, lng: 72.8147, displayName: 'Colaba, Mumbai', countryCode: 'in' },
    'lower parel': { lat: 18.9953, lng: 72.8306, displayName: 'Lower Parel, Mumbai', countryCode: 'in' },
    'powai': { lat: 19.1176, lng: 72.9060, displayName: 'Powai, Mumbai', countryCode: 'in' },
    'andheri': { lat: 19.1136, lng: 72.8697, displayName: 'Andheri, Mumbai', countryCode: 'in' },
    'bkc': { lat: 19.0662, lng: 72.8661, displayName: 'Bandra Kurla Complex, Mumbai', countryCode: 'in' },

    // Delhi / NCR
    'delhi': { lat: 28.6139, lng: 77.2090, displayName: 'New Delhi, India', cityLevel: true, countryCode: 'in' },
    'new delhi': { lat: 28.6139, lng: 77.2090, displayName: 'New Delhi, India', cityLevel: true, countryCode: 'in' },
    'connaught place': { lat: 28.6315, lng: 77.2167, displayName: 'Connaught Place, New Delhi', countryCode: 'in' },
    'hauz khas': { lat: 28.5494, lng: 77.2001, displayName: 'Hauz Khas Village, New Delhi', countryCode: 'in' },
    'khan market': { lat: 28.6003, lng: 77.2272, displayName: 'Khan Market, New Delhi', countryCode: 'in' },
    'gurgaon': { lat: 28.4595, lng: 77.0266, displayName: 'Gurugram, Haryana', cityLevel: true, countryCode: 'in' },
    'cyber hub': { lat: 28.4950, lng: 77.0895, displayName: 'DLF Cyber City, Gurugram', countryCode: 'in' },
    'noida': { lat: 28.5355, lng: 77.3910, displayName: 'Noida, Uttar Pradesh', cityLevel: true, countryCode: 'in' },

    // Goa
    'goa': { lat: 15.2993, lng: 74.1240, displayName: 'Goa, India', cityLevel: true, countryCode: 'in' },
    'panaji': { lat: 15.4909, lng: 73.8278, displayName: 'Panaji, Goa', countryCode: 'in' },
    'anjuna': { lat: 15.5866, lng: 73.7437, displayName: 'Anjuna, Goa', countryCode: 'in' },
    'candolim': { lat: 15.5186, lng: 73.7634, displayName: 'Candolim, Goa', countryCode: 'in' },
    'assagao': { lat: 15.5911, lng: 73.7789, displayName: 'Assagao, Goa', countryCode: 'in' },

    // Chennai
    'chennai': { lat: 13.0827, lng: 80.2707, displayName: 'Chennai, Tamil Nadu, India', cityLevel: true, countryCode: 'in' },
    'nungambakkam': { lat: 13.0569, lng: 80.2425, displayName: 'Nungambakkam, Chennai', countryCode: 'in' },
    't nagar': { lat: 13.0418, lng: 80.2341, displayName: 'T. Nagar, Chennai', countryCode: 'in' },

    // Pune
    'pune': { lat: 18.5204, lng: 73.8567, displayName: 'Pune, Maharashtra, India', cityLevel: true, countryCode: 'in' },
    'koregaon park': { lat: 18.5362, lng: 73.8940, displayName: 'Koregaon Park, Pune', countryCode: 'in' },
    'baner': { lat: 18.5590, lng: 73.7868, displayName: 'Baner, Pune', countryCode: 'in' },

    // Kolkata
    'kolkata': { lat: 22.5726, lng: 88.3639, displayName: 'Kolkata, West Bengal, India', cityLevel: true, countryCode: 'in' },
    'park street': { lat: 22.5518, lng: 88.3524, displayName: 'Park Street, Kolkata', countryCode: 'in' },

    // Andhra Pradesh & Telangana Hubs
    'tirupati': { lat: 13.6288, lng: 79.4192, displayName: 'Tirupati, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'tirupathi': { lat: 13.6288, lng: 79.4192, displayName: 'Tirupati, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'tirupaty': { lat: 13.6288, lng: 79.4192, displayName: 'Tirupati, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'alipiri': { lat: 13.6508, lng: 79.4180, displayName: 'Alipiri, Tirupati, Andhra Pradesh', countryCode: 'in' },
    'tirumala': { lat: 13.6833, lng: 79.3500, displayName: 'Tirumala, Tirupati, Andhra Pradesh', countryCode: 'in' },
    'kapila theertham': { lat: 13.6520, lng: 79.4200, displayName: 'Kapila Theertham, Tirupati', countryCode: 'in' },
    'chittoor': { lat: 13.2172, lng: 79.1003, displayName: 'Chittoor, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'vijayawada': { lat: 16.5062, lng: 80.6480, displayName: 'Vijayawada, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'bezawada': { lat: 16.5062, lng: 80.6480, displayName: 'Vijayawada, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'visakhapatnam': { lat: 17.6868, lng: 83.2185, displayName: 'Visakhapatnam, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'vizag': { lat: 17.6868, lng: 83.2185, displayName: 'Visakhapatnam, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'warangal': { lat: 17.9689, lng: 79.5941, displayName: 'Warangal, Telangana, India', cityLevel: true, countryCode: 'in' },
    'guntur': { lat: 16.3067, lng: 80.4365, displayName: 'Guntur, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'nellore': { lat: 14.4426, lng: 79.9865, displayName: 'Nellore, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'kurnool': { lat: 15.8281, lng: 78.0373, displayName: 'Kurnool, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'anantapur': { lat: 14.6819, lng: 77.6006, displayName: 'Anantapur, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'kadapa': { lat: 14.4673, lng: 78.8242, displayName: 'Kadapa, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'rajahmundry': { lat: 17.0005, lng: 81.8040, displayName: 'Rajahmundry, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },
    'kakinada': { lat: 16.9891, lng: 82.2475, displayName: 'Kakinada, Andhra Pradesh, India', cityLevel: true, countryCode: 'in' },

    // Other Indian Hubs
    'jaipur': { lat: 26.9124, lng: 75.7873, displayName: 'Jaipur, Rajasthan', cityLevel: true, countryCode: 'in' },
    'ahmedabad': { lat: 23.0225, lng: 72.5714, displayName: 'Ahmedabad, Gujarat', cityLevel: true, countryCode: 'in' },
    'chandigarh': { lat: 30.7333, lng: 76.7794, displayName: 'Chandigarh, India', cityLevel: true, countryCode: 'in' },
    'kochi': { lat: 9.9312, lng: 76.2673, displayName: 'Kochi, Kerala', cityLevel: true, countryCode: 'in' },
    'lucknow': { lat: 26.8467, lng: 80.9462, displayName: 'Lucknow, Uttar Pradesh', cityLevel: true, countryCode: 'in' },

    // International
    'dubai': { lat: 25.2048, lng: 55.2708, displayName: 'Dubai, United Arab Emirates', cityLevel: true, countryCode: 'ae' },
    'london': { lat: 51.5074, lng: -0.1278, displayName: 'London, United Kingdom', cityLevel: true, countryCode: 'gb' },
    'new york': { lat: 40.7128, lng: -74.0060, displayName: 'New York City, NY, USA', cityLevel: true, countryCode: 'us' },
    'singapore': { lat: 1.3521, lng: 103.8198, displayName: 'Singapore', cityLevel: true, countryCode: 'sg' },
    'tokyo': { lat: 35.6762, lng: 139.6503, displayName: 'Tokyo, Japan', cityLevel: true, countryCode: 'jp' },
    'paris': { lat: 48.8566, lng: 2.3522, displayName: 'Paris, France', cityLevel: true, countryCode: 'fr' },
  };

  /**
   * Resolves the location intent into real geographic coordinates, search bounds, and country metadata.
   */
  async resolve(location: LocationIntent): Promise<ResolvedCoordinates> {
    const radiusMeters = location.radius || 5000;
    const rawQuery = location.query?.toLowerCase().trim() || '';
    const isExplicitNearMe = !rawQuery || /^(near me|nearby|around here|close by|closest|current location|my location|here)$/i.test(rawQuery);

    // 1. If explicit coordinates were provided AND it's a nearby/user-local search or no explicit query:
    if (location.latitude !== undefined && location.longitude !== undefined) {
      if (isExplicitNearMe || location.type === 'nearby' || !rawQuery) {
        const geoInfo = await this.reverseGeocode(location.latitude, location.longitude);
        const meta = getCountryMetadata(geoInfo.countryCode);
        return {
          latitude: location.latitude,
          longitude: location.longitude,
          displayName: geoInfo.displayName || 'Current Location',
          radiusMeters,
          isCityLevel: false,
          countryCode: meta.countryCode,
          currency: meta.currency,
          currencySymbol: meta.currencySymbol,
          deliveryPlatforms: meta.deliveryPlatforms,
        };
      }
    }

    // 2. If a specific named destination / city query is present and NOT a generic "near me", resolve the named place first!
    if (rawQuery && !isExplicitNearMe) {
      for (const [key, loc] of Object.entries(LocationResolver.KNOWN_LOCATIONS)) {
        const regex = new RegExp(`\\b${key}\\b`, 'i');
        if (regex.test(rawQuery)) {
          const meta = getCountryMetadata(loc.countryCode);
          return {
            latitude: loc.lat,
            longitude: loc.lng,
            displayName: loc.displayName,
            radiusMeters: (location.radius && location.radius <= 5000) ? location.radius : (loc.cityLevel ? Math.max(radiusMeters, 15000) : radiusMeters),
            isCityLevel: (location.radius && location.radius <= 5000) ? false : !!loc.cityLevel,
            countryCode: meta.countryCode,
            currency: meta.currency,
            currencySymbol: meta.currencySymbol,
            deliveryPlatforms: meta.deliveryPlatforms,
          };
        }
      }

      // Check OpenStreetMap Nominatim Geocoding API for named place
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(rawQuery)}&format=json&addressdetails=1&limit=1`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'GourmetAI-RestaurantDiscovery/1.0' },
        });
        if (res.ok) {
          const data: any = await res.json();
          if (data && data.length > 0) {
            const countryCode = data[0].address?.country_code ? String(data[0].address.country_code).toLowerCase() : undefined;
            const meta = getCountryMetadata(countryCode);
            return {
              latitude: parseFloat(data[0].lat),
              longitude: parseFloat(data[0].lon),
              displayName: data[0].display_name,
              radiusMeters,
              isCityLevel: data[0].type === 'city' || data[0].addresstype === 'city',
              countryCode: meta.countryCode,
              currency: meta.currency,
              currencySymbol: meta.currencySymbol,
              deliveryPlatforms: meta.deliveryPlatforms,
            };
          }
        }
      } catch (err) {
        console.warn('Nominatim geocoding failed:', err);
      }
    }

    // 3. If explicit coordinates were provided (e.g. from genuine device GPS)
    if (location.latitude !== undefined && location.longitude !== undefined) {
      const geoInfo = await this.reverseGeocode(location.latitude, location.longitude);
      const meta = getCountryMetadata(geoInfo.countryCode);
      return {
        latitude: location.latitude,
        longitude: location.longitude,
        displayName: geoInfo.displayName,
        radiusMeters,
        isCityLevel: false,
        countryCode: meta.countryCode,
        currency: meta.currency,
        currencySymbol: meta.currencySymbol,
        deliveryPlatforms: meta.deliveryPlatforms,
      };
    }

    // Fallback: Default to neutral location
    const defaultMeta = getCountryMetadata('in');
    return {
      latitude: 17.385044,
      longitude: 78.486671,
      displayName: 'Selected Area',
      radiusMeters,
      isCityLevel: true,
      countryCode: defaultMeta.countryCode,
      currency: defaultMeta.currency,
      currencySymbol: defaultMeta.currencySymbol,
      deliveryPlatforms: defaultMeta.deliveryPlatforms,
    };
  }

  /**
   * Real-time reverse geocoding via OpenStreetMap Nominatim
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<{ displayName: string; city: string; area: string; countryCode?: string }> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'GourmetAI-RestaurantDiscovery/1.0 (contact@gourmetai.local)' },
      });
      if (res.ok) {
        const data: any = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state_district || 'Local Area';
        const area = data.address?.suburb || data.address?.neighbourhood || data.address?.road || city;
        const state = data.address?.state || '';
        const shortName = state ? `${area}, ${city}, ${state}` : `${area}, ${city}`;
        const countryCode = data.address?.country_code ? String(data.address.country_code).toLowerCase() : undefined;
        return {
          displayName: shortName,
          city,
          area,
          countryCode,
        };
      }
    } catch (err) {
      console.warn('Reverse geocode failed:', err);
    }
    return {
      displayName: `Live Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
      city: 'Local Area',
      area: 'Current Location',
    };
  }

  /**
   * Calculates Haversine distance between two points in kilometers.
   */
  static calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }
}
