import { Response } from 'express';
import { AuthRequest, UserRole, ApiResponse } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import * as userService from '../services/userService';

const ADMIN_OR_MANAGER = [UserRole.ADMIN, UserRole.MANAGER];

export const getAllUsers = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const caller = req.user!;

    if (!ADMIN_OR_MANAGER.includes(caller.role as UserRole)) {
      throw ApiError.forbidden('Only admins and managers can view all users');
    }

    const users = await userService.fetchAllUsers(caller);

    const response: ApiResponse = {
      success: true,
      message: 'Users retrieved',
      data: { users },
    };

    res.status(200).json(response);
  }
);

export const getTeamMembers = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const members = await userService.fetchTeamMembers(req.user!);

    const response: ApiResponse = {
      success: true,
      message: 'Team members retrieved',
      data: { members },
    };

    res.status(200).json(response);
  }
);

export const getUnassignedUsers = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!ADMIN_OR_MANAGER.includes(req.user!.role as UserRole)) {
      throw ApiError.forbidden('Only admins and managers can view unassigned users');
    }

    const users = await userService.fetchUnassignedUsers(req.query.role as string | undefined);

    const response: ApiResponse = {
      success: true,
      message: 'Unassigned users retrieved',
      data: { users },
    };

    res.status(200).json(response);
  }
);

export const assignUser = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const caller = req.user!;

    if (!ADMIN_OR_MANAGER.includes(caller.role as UserRole)) {
      throw ApiError.forbidden('Only admins and managers can assign users');
    }

    const { user, message } = await userService.assignUserToManager(
      req.params.id as string,
      req.body.managedBy,
      caller
    );

    const response: ApiResponse = {
      success: true,
      message,
      data: { user },
    };

    res.status(200).json(response);
  }
);

export const unassignUser = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const caller = req.user!;

    if (!ADMIN_OR_MANAGER.includes(caller.role as UserRole)) {
      throw ApiError.forbidden('Only admins and managers can unassign users');
    }

    const user = await userService.unassignUserFromTeam(
      req.params.id as string,
      caller
    );

    const response: ApiResponse = {
      success: true,
      message: `User '${user.username}' has been unassigned`,
      data: { user },
    };

    res.status(200).json(response);
  }
);

export const getAssignableUsers = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const users = await userService.fetchAssignableUsers(req.user!);

    const response: ApiResponse = {
      success: true,
      message: 'Assignable users retrieved',
      data: { users },
    };

    res.status(200).json(response);
  }
);

export const changeUserRole = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user!.role !== UserRole.ADMIN) {
      throw ApiError.forbidden('Only admins can change user roles');
    }

    const { user, oldRole } = await userService.updateUserRole(
      req.params.id as string,
      req.body.role,
      req.user!._id.toString()
    );

    const response: ApiResponse = {
      success: true,
      message: `User '${user.username}' role changed from ${oldRole} to ${user.role}`,
      data: { user },
    };

    res.status(200).json(response);
  }
);

export const deleteUser = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user!.role !== UserRole.ADMIN) {
      throw ApiError.forbidden('Only admins can delete users');
    }

    const user = await userService.removeUser(
      req.params.id as string,
      req.user!._id.toString()
    );

    const response: ApiResponse = {
      success: true,
      message: `User '${user.username}' has been deleted`,
    };

    res.status(200).json(response);
  }
);

export const getUserStats = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.user!.role !== UserRole.ADMIN) {
      throw ApiError.forbidden('Only admins can view user stats');
    }

    const stats = await userService.fetchUserStats();

    const response: ApiResponse = {
      success: true,
      message: 'User statistics retrieved',
      data: { stats },
    };

    res.status(200).json(response);
  }
);
