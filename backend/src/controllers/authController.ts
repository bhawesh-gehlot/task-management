import { Response } from 'express';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import User from '../models/User';
import { AuthRequest, UserRole, ApiResponse, JwtPayload } from '../types';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

const generateToken = (id: string, role: UserRole): string => {
  const payload: JwtPayload = { id, role };
  const secret: jwt.Secret = process.env.JWT_SECRET || '';
  const expiresIn = (process.env.JWT_EXPIRES_IN || '24h') as StringValue;
  return jwt.sign(payload, secret, { expiresIn });
};

export const register = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { username, email, password, role } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      throw ApiError.conflict(`A user with this ${field} already exists`);
    }

    const user = await User.create({ username, email, password, role });

    const token = generateToken(user._id.toString(), user.role as UserRole);

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

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const token = generateToken(user._id.toString(), user.role as UserRole);

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
    const user = await User.findById(req.user!._id)
      .select('-password')
      .populate('managedBy', 'username email role');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Profile retrieved',
      data: { user },
    };

    res.status(200).json(response);
  }
);
