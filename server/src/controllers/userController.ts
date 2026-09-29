import { Request, Response } from 'express';
import { SearchController } from './searchController';
import { NormalizedPlace } from '../models/place';

export class UserController {
  private static savedPlaces: Map<string, NormalizedPlace> = new Map();

  /**
   * POST /api/saved-places
   */
  async savePlace(req: Request, res: Response): Promise<void> {
    try {
      const place = req.body;
      if (!place || !place.id) {
        res.status(400).json({ error: 'Valid place object with id is required' });
        return;
      }
      UserController.savedPlaces.set(place.id, place);
      res.json({ success: true, saved: Array.from(UserController.savedPlaces.values()) });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save place', details: err.message });
    }
  }

  /**
   * GET /api/saved-places
   */
  async getSavedPlaces(req: Request, res: Response): Promise<void> {
    try {
      res.json(Array.from(UserController.savedPlaces.values()));
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve saved places' });
    }
  }

  /**
   * DELETE /api/saved-places/:id
   */
  async removeSavedPlace(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      UserController.savedPlaces.delete(id);
      res.json({ success: true, saved: Array.from(UserController.savedPlaces.values()) });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to remove saved place' });
    }
  }

  /**
   * GET /api/search-history
   */
  async getSearchHistory(req: Request, res: Response): Promise<void> {
    try {
      res.json(SearchController.getHistory());
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve history' });
    }
  }
}
