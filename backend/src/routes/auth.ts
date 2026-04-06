import { Router } from 'express';
import { register, login, getProfile } from '../controllers/authController';
import { registerValidator, loginValidator } from '../validators/authValidator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.get('/me', authenticate, getProfile);

export default router;
