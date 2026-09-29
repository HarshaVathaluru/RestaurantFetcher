import { Router } from 'express';
import { PlacesController } from '../controllers/placesController';

const router = Router();
const controller = new PlacesController();

router.get('/places/:id', (req, res) => controller.getDetails(req, res));
router.get('/places/:id/photos', (req, res) => controller.getPhotos(req, res));
router.get('/places/:id/directions', (req, res) => controller.getDirections(req, res));

export default router;
