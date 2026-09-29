import { Request, Response } from 'express';
import { CompositePlaceProvider } from '../services/places/placeProvider';

export class PlacesController {
  private placeProvider = new CompositePlaceProvider();

  /**
   * GET /api/places/:id
   */
  async getDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const place = await this.placeProvider.getDetails(id);
      if (!place) {
        res.status(404).json({ error: 'Place not found' });
        return;
      }
      res.json(place);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve place details', details: err.message });
    }
  }

  /**
   * GET /api/places/:id/photos
   */
  async getPhotos(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const photos = await this.placeProvider.getPhotos(id);
      res.json({ id, photos });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve photos', details: err.message });
    }
  }

  /**
   * GET /api/places/:id/directions
   */
  async getDirections(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const place = await this.placeProvider.getDetails(id);
      if (!place) {
        res.status(404).json({ error: 'Place not found' });
        return;
      }
      const directionsUrl = place.links?.googleMaps || place.directionsUrl || `https://maps.google.com/?q=${place.latitude},${place.longitude}`;
      res.json({
        id: place.id,
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        directionsUrl,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve directions', details: err.message });
    }
  }
}
