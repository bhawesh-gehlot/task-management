import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  reassignTask,
  getTaskStats,
} from '../controllers/taskController';
import {
  createTaskValidator,
  updateTaskValidator,
  reassignTaskValidator,
  taskIdValidator,
  taskQueryValidator,
} from '../validators/taskValidator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roleAuth';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

router.get('/stats', getTaskStats);
router.get('/', taskQueryValidator, validate, getTasks);
router.post('/', createTaskValidator, validate, createTask);
router.get('/:id', taskIdValidator, validate, getTaskById);
router.put('/:id', updateTaskValidator, validate, updateTask);
router.delete('/:id', taskIdValidator, validate, deleteTask);
router.put(
  '/:id/reassign',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEAM_LEAD),
  reassignTaskValidator,
  validate,
  reassignTask
);

export default router;
