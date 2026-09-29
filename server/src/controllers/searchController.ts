import { Request, Response } from 'express';
import { IntentParserService } from '../services/ai/intentParser';
import { LocationResolver } from '../services/location/locationResolver';
import { CompositePlaceProvider } from '../services/places/placeProvider';
import { RankingEngine } from '../services/ranking/rankingEngine';
import { PlaceValidator } from '../services/places/placeValidator';
import { SearchIntent } from '../models/place';

export class SearchController {
  private intentParser = new IntentParserService();
  private locationResolver = new LocationResolver();
  private placeProvider = new CompositePlaceProvider();
  private rankingEngine = new RankingEngine();

  // Search history memory
  private static searchHistory: Array<{ id: string; query: string; timestamp: string; resultsCount: number }> = [];

  /**
   * POST /api/search
   * Request body: { query: string, latitude?: number, longitude?: number }
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const { query, latitude, longitude, location, locationName, locationStr: bodyLocStr, coordinates } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const reqLat = typeof latitude === 'number' ? latitude : (typeof coordinates?.latitude === 'number' ? coordinates.latitude : undefined);
      const reqLon = typeof longitude === 'number' ? longitude : (typeof coordinates?.longitude === 'number' ? coordinates.longitude : undefined);

      let userCoords = (typeof reqLat === 'number' && typeof reqLon === 'number')
        ? { latitude: reqLat, longitude: reqLon }
        : undefined;

      const locationStr = typeof location === 'string' && location.trim().length > 0
        ? location.trim()
        : (typeof locationName === 'string' && locationName.trim().length > 0
            ? locationName.trim()
            : (typeof bodyLocStr === 'string' && bodyLocStr.trim().length > 0 ? bodyLocStr.trim() : undefined));

      if (!userCoords && locationStr) {
        const resolved = await this.locationResolver.resolve({ type: 'city', query: locationStr, radius: 10000 });
        userCoords = { latitude: resolved.latitude, longitude: resolved.longitude };
      }

      // 1. AI Intent Extraction
      const intent = await this.intentParser.parseQuery(query, userCoords);

      // Guard: Distance strings like "2 km" are radius constraints, never destination names
      if (intent.location.query && /^(?:within|near|under|in|around|less\s+than)?\s*\d+(?:\.\d+)?\s*(?:km|kms|kilo|kilometers?|k|m|meters?)$/i.test(intent.location.query.trim())) {
        intent.location.query = undefined;
        intent.location.type = 'nearby';
      }

      // Check if user's natural query specified an explicit destination
      const hasExplicitDestination = Boolean(
        intent.location.query &&
        !/^(near me|nearby|around here|close by|closest|my location|here)$/i.test(intent.location.query.trim())
      );

      // If user query did NOT mention any explicit destination, preserve user coordinates as nearby
      if (!hasExplicitDestination) {
        if (userCoords) {
          intent.location = {
            ...intent.location,
            type: 'nearby',
            query: undefined,
            latitude: userCoords.latitude,
            longitude: userCoords.longitude,
          };
        } else if (locationStr) {
          intent.location = {
            ...intent.location,
            type: 'city',
            query: locationStr,
          };
        }
      }

      // 2. Location Resolution
      const coords = await this.locationResolver.resolve(intent.location);

      const requestId = (typeof req.body.requestId === 'string' && req.body.requestId) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 3. Real Place Search via Provider Adapter
      const rawPlaces = await this.placeProvider.search({ intent, coords });

      // 4. Validate & Deduplicate (Pipeline: Raw -> Validate -> Remove Invalid -> Deduplicate)
      const { deduplicated, duplicatesRemoved, invalidRemoved } = PlaceValidator.deduplicate(rawPlaces);

      // 5. Hard Filtering + Relevance Ranking + Match Explanation
      const rankedPlaces = this.rankingEngine.filterAndRank(deduplicated, intent);

      // Record in search history
      SearchController.searchHistory.unshift({
        id: `sh_${Date.now()}`,
        query,
        timestamp: new Date().toISOString(),
        resultsCount: rankedPlaces.length,
      });
      if (SearchController.searchHistory.length > 50) {
        SearchController.searchHistory.pop();
      }

      res.json({
        requestId,
        query,
        intent,
        resolvedLocation: coords,
        total: rankedPlaces.length,
        places: rankedPlaces,
        debug: {
          requestId,
          rawCount: rawPlaces.length,
          invalidRemoved,
          duplicatesRemoved,
          validatedCount: deduplicated.length,
          exactFoodMatches: rankedPlaces.filter(p => p.matchedFoodItems && p.matchedFoodItems.length > 0).length,
          searchLocation: coords.displayName,
          radiusMeters: coords.radiusMeters,
        },
      });
    } catch (err: any) {
      console.error('Search error:', err);
      res.status(500).json({ error: 'Search failed', details: err.message });
    }
  }

  /**
   * POST /api/search/parse
   * Just parse natural language without querying places.
   */
  async parse(req: Request, res: Response): Promise<void> {
    try {
      const { query, latitude, longitude } = req.body;
      if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const userCoords = (typeof latitude === 'number' && typeof longitude === 'number')
        ? { latitude, longitude }
        : undefined;

      const intent = await this.intentParser.parseQuery(query, userCoords);
      res.json({ query, intent });
    } catch (err: any) {
      res.status(500).json({ error: 'Parse failed', details: err.message });
    }
  }

  /**
   * POST /api/search/refine
   * Conversational Refinement: modifies active SearchIntent and re-ranks.
   */
  async refine(req: Request, res: Response): Promise<void> {
    try {
      const { previousIntent, refinementQuery, latitude, longitude, location, locationName, locationStr: bodyLocStr, coordinates } = req.body;
      if (!previousIntent || !refinementQuery) {
        res.status(400).json({ error: 'previousIntent and refinementQuery are required' });
        return;
      }

      const reqLat = typeof latitude === 'number' ? latitude : (typeof coordinates?.latitude === 'number' ? coordinates.latitude : undefined);
      const reqLon = typeof longitude === 'number' ? longitude : (typeof coordinates?.longitude === 'number' ? coordinates.longitude : undefined);

      let userCoords = (typeof reqLat === 'number' && typeof reqLon === 'number')
        ? { latitude: reqLat, longitude: reqLon }
        : undefined;

      const locationStr = typeof location === 'string' && location.trim().length > 0
        ? location.trim()
        : (typeof locationName === 'string' && locationName.trim().length > 0
            ? locationName.trim()
            : (typeof bodyLocStr === 'string' && bodyLocStr.trim().length > 0 ? bodyLocStr.trim() : undefined));

      if (!userCoords && locationStr) {
        const resolved = await this.locationResolver.resolve({ type: 'city', query: locationStr, radius: 10000 });
        userCoords = { latitude: resolved.latitude, longitude: resolved.longitude };
      }

      // 1. Merge and refine intent
      const updatedIntent = await this.intentParser.refineIntent(previousIntent, refinementQuery, userCoords);

      // Guard: Distance strings like "2 km" are radius constraints, never destination names
      if (updatedIntent.location.query && /^(?:within|near|under|in|around|less\s+than)?\s*\d+(?:\.\d+)?\s*(?:km|kms|kilo|kilometers?|k|m|meters?)$/i.test(updatedIntent.location.query.trim())) {
        updatedIntent.location.query = undefined;
        updatedIntent.location.type = 'nearby';
      }

      const hasExplicitDestination = Boolean(
        updatedIntent.location.query &&
        !/^(near me|nearby|around here|close by|closest|my location|here)$/i.test(updatedIntent.location.query.trim())
      );

      if (!hasExplicitDestination) {
        if (userCoords) {
          updatedIntent.location = {
            ...updatedIntent.location,
            type: 'nearby',
            query: undefined,
            latitude: userCoords.latitude,
            longitude: userCoords.longitude,
          };
        } else if (locationStr) {
          updatedIntent.location = {
            ...updatedIntent.location,
            type: 'city',
            query: locationStr,
          };
        }
      }

      // 2. Resolve location
      const coords = await this.locationResolver.resolve(updatedIntent.location);

      const requestId = (typeof req.body.requestId === 'string' && req.body.requestId) || `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 3. Search and re-rank
      const rawPlaces = await this.placeProvider.search({ intent: updatedIntent, coords });
      const { deduplicated, duplicatesRemoved, invalidRemoved } = PlaceValidator.deduplicate(rawPlaces);
      const rankedPlaces = this.rankingEngine.filterAndRank(deduplicated, updatedIntent);

      res.json({
        requestId,
        refinementQuery,
        intent: updatedIntent,
        resolvedLocation: coords,
        total: rankedPlaces.length,
        places: rankedPlaces,
        debug: {
          requestId,
          rawCount: rawPlaces.length,
          invalidRemoved,
          duplicatesRemoved,
          validatedCount: deduplicated.length,
          exactFoodMatches: rankedPlaces.filter(p => p.matchedFoodItems && p.matchedFoodItems.length > 0).length,
          searchLocation: coords.displayName,
          radiusMeters: coords.radiusMeters,
        },
      });
    } catch (err: any) {
      console.error('Refine error:', err);
      res.status(500).json({ error: 'Refinement failed', details: err.message });
    }
  }

  async reverseGeocode(req: Request, res: Response): Promise<void> {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lon = parseFloat(req.query.lon as string);
      if (isNaN(lat) || isNaN(lon)) {
        res.status(400).json({ error: 'lat and lon query params are required' });
        return;
      }
      const geoInfo = await this.locationResolver.reverseGeocode(lat, lon);
      res.json(geoInfo);
    } catch (err: any) {
      console.error('Reverse geocode error:', err);
      res.status(500).json({ error: 'Failed to reverse geocode', details: err.message });
    }
  }

  static getHistory(): Array<{ id: string; query: string; timestamp: string; resultsCount: number }> {
    return SearchController.searchHistory;
  }
}
