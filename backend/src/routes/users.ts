import { Router } from 'express';
import {
  getAllUsers,
  getTeamMembers,
  getUnassignedUsers,
  assignUser,
  unassignUser,
  getAssignableUsers,
  changeUserRole,
  deleteUser,
  getUserStats,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/roleAuth';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

router.get('/stats', authorize(UserRole.ADMIN), getUserStats);
router.get('/', authorize(UserRole.ADMIN, UserRole.MANAGER), getAllUsers);
router.get('/team', authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEAM_LEAD), getTeamMembers);
router.get('/unassigned', authorize(UserRole.ADMIN, UserRole.MANAGER), getUnassignedUsers);
router.get('/assignable', getAssignableUsers);
router.put('/:id/assign', authorize(UserRole.ADMIN, UserRole.MANAGER), assignUser);
router.put('/:id/unassign', authorize(UserRole.ADMIN, UserRole.MANAGER), unassignUser);
router.put('/:id/role', authorize(UserRole.ADMIN), changeUserRole);
router.delete('/:id', authorize(UserRole.ADMIN), deleteUser);

export default router;
