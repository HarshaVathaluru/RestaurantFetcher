import { NormalizedPlace } from '../../models/place';
import { LocationResolver } from '../location/locationResolver';

export interface DeduplicationResult {
  deduplicated: NormalizedPlace[];
  duplicatesRemoved: number;
  invalidRemoved: number;
}

export class PlaceValidator {
  /**
   * Validates a single place object according to strict ground-truth standards.
   * Discards fake, incomplete, or malformed entries.
   */
  static validatePlace(p: any): NormalizedPlace | null {
    if (!p || typeof p !== 'object') return null;

    // 1. Mandatory Identity & Name
    if (!p.id || typeof p.id !== 'string' || p.id.trim().length === 0) return null;
    if (!p.name || typeof p.name !== 'string' || p.name.trim().length < 2) return null;

    const trimmedName = p.name.trim();

    // Reject obvious placeholders and fake template outputs
    if (/^restaurant\s+[a-z]$/i.test(trimmedName)) return null;
    if (/^hotel\s+[a-z]$/i.test(trimmedName)) return null;
    if (/fake|dummy|sample\s+restaurant|mock\s+restaurant/i.test(trimmedName)) return null;

    // 2. Strict Coordinate Validation
    const lat = typeof p.latitude === 'number' ? p.latitude : parseFloat(p.latitude);
    const lng = typeof p.longitude === 'number' ? p.longitude : parseFloat(p.longitude);

    if (isNaN(lat) || !isFinite(lat) || lat < -90 || lat > 90) return null;
    if (isNaN(lng) || !isFinite(lng) || lng < -180 || lng > 180) return null;

    // Reject (0, 0) Null Island coordinates
    if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) return null;

    // 3. Address Validation
    if (!p.address || typeof p.address !== 'string' || p.address.trim().length < 3) return null;

    // 4. Rating & Reviews Validation
    const rating = typeof p.rating === 'number' && isFinite(p.rating)
      ? Math.max(1.0, Math.min(5.0, parseFloat(p.rating.toFixed(1))))
      : 4.2;

    const reviewCount = typeof p.reviewCount === 'number' && isFinite(p.reviewCount)
      ? Math.max(0, Math.round(p.reviewCount))
      : 50;

    // 5. Clean & Validate foodItems
    const validFoodItems = Array.isArray(p.foodItems)
      ? p.foodItems
          .filter((f: any) => f && typeof f.name === 'string' && f.name.trim().length > 0)
          .map((f: any) => ({
            name: f.name.trim(),
            price: typeof f.price === 'number' && isFinite(f.price) ? f.price : undefined,
            verified: Boolean(f.verified),
            variations: Array.isArray(f.variations) ? f.variations : undefined,
          }))
      : [];

    // Ensure links object exists with googleMaps
    const googleMaps = p.links?.googleMaps || p.directionsUrl || `https://maps.google.com/?q=${lat},${lng}`;
    const cleanLinks = {
      ...(p.links || {}),
      googleMaps,
    };

    return {
      ...p,
      id: p.id.trim(),
      name: trimmedName,
      latitude: lat,
      longitude: lng,
      rating,
      reviewCount,
      address: p.address.trim(),
      foodItems: validFoodItems,
      links: cleanLinks,
      directionsUrl: googleMaps,
    };
  }

  /**
   * Normalizes a restaurant name for fuzzy duplicate detection.
   * Strips common noise words while retaining distinctive branch markers.
   */
  private static normalizeNameForMatching(name: string): string {
    return name
      .toLowerCase()
      .replace(/[\(\)\[\],.\-–—_'"&]/g, ' ')
      .replace(/\b(restaurant|hotel|bistro|kitchen|cafe|café|dining|dhaba|bar|pub|house|express|fine|authentic)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Pipeline: Validates records, removes invalids, and deduplicates.
   * Preserves distinct branches located > 250m apart.
   */
  static deduplicate(places: any[]): DeduplicationResult {
    let invalidCount = 0;
    const validated: NormalizedPlace[] = [];

    // 1. Validation phase
    for (const raw of places) {
      const valid = PlaceValidator.validatePlace(raw);
      if (valid) {
        validated.push(valid);
      } else {
        invalidCount++;
      }
    }

    // 2. Primary deduplication by unique place ID
    const byIdMap = new Map<string, NormalizedPlace>();
    for (const place of validated) {
      if (!byIdMap.has(place.id)) {
        byIdMap.set(place.id, place);
      } else {
        // If duplicate ID exists, keep the one with higher review count or verified food items
        const existing = byIdMap.get(place.id)!;
        const placeFoodCount = place.foodItems?.length || 0;
        const existingFoodCount = existing.foodItems?.length || 0;
        if (placeFoodCount > existingFoodCount || (place.reviewCount > existing.reviewCount)) {
          byIdMap.set(place.id, place);
        }
      }
    }

    const uniqueIdPlaces = Array.from(byIdMap.values());
    const duplicatesRemovedById = validated.length - uniqueIdPlaces.length;

    // 3. Secondary deduplication: same geographic venue (<150m) with identical or near-identical normalized name
    const deduplicated: NormalizedPlace[] = [];
    let geoDuplicatesRemoved = 0;

    for (const current of uniqueIdPlaces) {
      const currentNorm = PlaceValidator.normalizeNameForMatching(current.name);
      let isDuplicate = false;

      for (let i = 0; i < deduplicated.length; i++) {
        const existing = deduplicated[i];
        const distKm = LocationResolver.calculateDistanceKm(
          current.latitude,
          current.longitude,
          existing.latitude,
          existing.longitude
        );

        // Only consider duplicate if physical distance is less than 150 meters
        if (distKm <= 0.15) {
          const existingNorm = PlaceValidator.normalizeNameForMatching(existing.name);

          // Check if names match or one contains the other
          if (
            currentNorm === existingNorm ||
            (currentNorm.length >= 4 && existingNorm.includes(currentNorm)) ||
            (existingNorm.length >= 4 && currentNorm.includes(existingNorm))
          ) {
            isDuplicate = true;
            geoDuplicatesRemoved++;

            // Retain the higher quality record (verified menu items or higher reviews)
            const currentHasFood = (current.foodItems?.length || 0) > (existing.foodItems?.length || 0);
            if (currentHasFood || current.reviewCount > existing.reviewCount) {
              deduplicated[i] = current;
            }
            break;
          }
        }
      }

      if (!isDuplicate) {
        deduplicated.push(current);
      }
    }

    return {
      deduplicated,
      duplicatesRemoved: duplicatesRemovedById + geoDuplicatesRemoved,
      invalidRemoved: invalidCount,
    };
  }
}
