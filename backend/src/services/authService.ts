import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import User from '../models/User';
import { IUser, UserRole, JwtPayload } from '../types';
import { ApiError } from '../utils/ApiError';

export const generateToken = (id: string, role: UserRole): string => {
  const payload: JwtPayload = { id, role };
  const secret: jwt.Secret = process.env.JWT_SECRET || '';
  const expiresIn = (process.env.JWT_EXPIRES_IN || '24h') as StringValue;
  return jwt.sign(payload, secret, { expiresIn });
};

export const loginUser = async (
  email: string,
  password: string
): Promise<{ token: string; user: IUser }> => {
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = generateToken(user._id.toString(), user.role as UserRole);
  return { token, user };
};

export const registerUser = async (data: {
  username: string;
  email: string;
  password: string;
  role: string;
}): Promise<{ token: string; user: IUser }> => {
  const { username, email, password, role } = data;

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username';
    throw ApiError.conflict(`A user with this ${field} already exists`);
  }

  const user = await User.create({ username, email, password, role });
  const token = generateToken(user._id.toString(), user.role as UserRole);
  return { token, user };
};

export const getUserProfile = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId)
    .select('-password')
    .populate('managedBy', 'username email role');

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return user;
};
