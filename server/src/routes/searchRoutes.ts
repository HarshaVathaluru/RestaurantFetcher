import { Router } from 'express';
import { SearchController } from '../controllers/searchController';

const router = Router();
const controller = new SearchController();

router.post('/search', (req, res) => controller.search(req, res));
router.post('/search/parse', (req, res) => controller.parse(req, res));
router.post('/search/refine', (req, res) => controller.refine(req, res));
router.get('/location/reverse', (req, res) => controller.reverseGeocode(req, res));

export default router;
