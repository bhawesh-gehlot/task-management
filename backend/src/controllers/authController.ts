import { Response } from 'express';
import { AuthRequest, UserRole, ApiResponse } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import * as authService from '../services/authService';

export const register = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { token, user } = await authService.registerUser(req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    };

    res.status(201).json(response);
  }
);

export const login = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const { token, user } = await authService.loginUser(email, password);

    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          managedBy: user.managedBy,
        },
      },
    };

    res.status(200).json(response);
  }
);

export const getProfile = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await authService.getUserProfile(req.user!._id.toString());

    const response: ApiResponse = {
      success: true,
      message: 'Profile retrieved',
      data: { user },
    };

    res.status(200).json(response);
  }
);
