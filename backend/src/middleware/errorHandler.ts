import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../types';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error: ApiError;

  if (err instanceof ApiError) {
    error = err;
  } else if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = ApiError.badRequest('Validation failed', errors);
  } else if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  } else if ((err as { code?: number }).code === 11000) {
    const field = Object.keys(
      (err as { keyValue?: Record<string, unknown> }).keyValue || {}
    )[0];
    error = ApiError.conflict(
      `${field ? `A record with this ${field}` : 'A duplicate record'} already exists`
    );
  } else {
    console.error('Unhandled error:', err);
    error = ApiError.internal();
  }

  const response: ApiResponse = {
    success: false,
    message: error.message,
    ...(error.errors.length > 0 && { errors: error.errors }),
  };

  res.status(error.statusCode).json(response);
};

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};
