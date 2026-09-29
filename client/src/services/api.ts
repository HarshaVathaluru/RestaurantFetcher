import { SearchResponse, NormalizedPlace, SearchIntent, SearchHistoryItem } from '../types';

const envApiUrl = (import.meta as any).env?.VITE_API_URL;
const API_BASE = envApiUrl ? `${envApiUrl}/api` : '/api';

export const api = {
  /**
   * Natural language place search
   */
  async search(
    query: string,
    coords?: { latitude: number; longitude: number },
    locationName?: string,
    requestId?: string
  ): Promise<SearchResponse> {
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        locationName,
        requestId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Search failed' }));
      throw new Error(err.error || 'Search failed');
    }
    return res.json();
  },

  /**
   * Conversational Refinement (merges context with new instructions)
   */
  async refine(
    previousIntent: SearchIntent,
    refinementQuery: string,
    coords?: { latitude: number; longitude: number },
    locationName?: string,
    requestId?: string
  ): Promise<SearchResponse> {
    const res = await fetch(`${API_BASE}/search/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        previousIntent,
        refinementQuery,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        locationName,
        requestId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Refinement failed' }));
      throw new Error(err.error || 'Refinement failed');
    }
    return res.json();
  },

  /**
   * Get single place details
   */
  async getPlaceDetails(id: string): Promise<NormalizedPlace> {
    const res = await fetch(`${API_BASE}/places/${id}`);
    if (!res.ok) throw new Error('Failed to fetch place details');
    return res.json();
  },

  /**
   * Saved Places / Bookmarks
   */
  async getSavedPlaces(): Promise<NormalizedPlace[]> {
    const res = await fetch(`${API_BASE}/saved-places`);
    if (!res.ok) return [];
    return res.json();
  },

  async savePlace(place: NormalizedPlace): Promise<void> {
    await fetch(`${API_BASE}/saved-places`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(place),
    });
  },

  async removeSavedPlace(id: string): Promise<void> {
    await fetch(`${API_BASE}/saved-places/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Search History
   */
  async getSearchHistory(): Promise<SearchHistoryItem[]> {
    const res = await fetch(`${API_BASE}/search-history`);
    if (!res.ok) return [];
    return res.json();
  },

  /**
   * Real-time reverse geocoding
   */
  async reverseGeocode(lat: number, lon: number): Promise<{ displayName: string; city: string; area: string }> {
    const res = await fetch(`${API_BASE}/location/reverse?lat=${lat}&lon=${lon}`);
    if (!res.ok) return { displayName: 'Current Location', city: 'Local Area', area: 'Current Area' };
    return res.json();
  },
};
