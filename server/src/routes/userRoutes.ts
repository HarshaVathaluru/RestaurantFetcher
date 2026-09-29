import { Router } from 'express';
import { UserController } from '../controllers/userController';

const router = Router();
const controller = new UserController();

router.post('/saved-places', (req, res) => controller.savePlace(req, res));
router.get('/saved-places', (req, res) => controller.getSavedPlaces(req, res));
router.delete('/saved-places/:id', (req, res) => controller.removeSavedPlace(req, res));
router.get('/search-history', (req, res) => controller.getSearchHistory(req, res));

export default router;
