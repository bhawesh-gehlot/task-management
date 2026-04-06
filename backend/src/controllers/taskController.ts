import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import * as taskService from '../services/taskService';

export const createTask = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const task = await taskService.createTask(req.user!, req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Task created successfully',
      data: { task },
    };

    res.status(201).json(response);
  }
);

export const getTasks = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { tasks, pagination } = await taskService.fetchTasks(req.user!, {
      status: req.query.status as string | undefined,
      assignedTo: req.query.assignedTo as string | undefined,
      search: req.query.search as string | undefined,
      page: Number(req.query.page),
      limit: Number(req.query.limit),
    });

    const response: ApiResponse = {
      success: true,
      message: 'Tasks retrieved',
      data: { tasks, pagination },
    };

    res.status(200).json(response);
  }
);

export const getTaskById = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const task = await taskService.fetchTaskById(req.params.id as string, req.user!);

    const response: ApiResponse = {
      success: true,
      message: 'Task retrieved',
      data: { task },
    };

    res.status(200).json(response);
  }
);

export const updateTask = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const task = await taskService.updateTask(req.params.id as string, req.user!, req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Task updated successfully',
      data: { task },
    };

    res.status(200).json(response);
  }
);

export const deleteTask = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    await taskService.deleteTask(req.params.id as string, req.user!);

    const response: ApiResponse = {
      success: true,
      message: 'Task deleted successfully',
    };

    res.status(200).json(response);
  }
);

export const reassignTask = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const task = await taskService.reassignTask(
      req.params.id as string,
      req.user!,
      req.body.assignedTo
    );

    const assignedUser = task.assignedTo as unknown as { username: string };
    const response: ApiResponse = {
      success: true,
      message: `Task reassigned to ${assignedUser.username}`,
      data: { task },
    };

    res.status(200).json(response);
  }
);

export const getTaskStats = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const stats = await taskService.fetchTaskStats(req.user!);

    const response: ApiResponse = {
      success: true,
      message: 'Task statistics retrieved',
      data: { stats },
    };

    res.status(200).json(response);
  }
);
