import { Response } from 'express';
import { Types } from 'mongoose';
import Task from '../models/Task';
import User from '../models/User';
import { AuthRequest, UserRole, TaskStatus, ApiResponse } from '../types';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { getSubordinateIds, sanitizePagination, isValidObjectId } from '../utils/helpers';
import { emitTaskEvent } from '../config/socket';

export const createTask = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    const { title, description, status, assignedTo } = req.body;

    let assigneeId = currentUser._id.toString();

    if (currentUser.role === UserRole.EMPLOYEE) {
      assigneeId = currentUser._id.toString();
    } else if (assignedTo) {
      if (!isValidObjectId(assignedTo)) {
        throw ApiError.badRequest('Invalid assignee ID');
      }

      const subordinateIds = await getSubordinateIds(
        currentUser._id.toString(),
        currentUser.role as UserRole
      );

      if (!subordinateIds.includes(assignedTo)) {
        throw ApiError.forbidden('Cannot assign tasks to users outside your hierarchy');
      }

      assigneeId = assignedTo;
    }

    const task = await Task.create({
      title,
      description: description || '',
      status: status || TaskStatus.PENDING,
      assignedTo: new Types.ObjectId(assigneeId),
      createdBy: currentUser._id,
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'username email role')
      .populate('createdBy', 'username email role');

    await emitTaskEvent('task:created', { task: populated }, assigneeId);

    const response: ApiResponse = {
      success: true,
      message: 'Task created successfully',
      data: { task: populated },
    };

    res.status(201).json(response);
  }
);

export const getTasks = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    const { status, assignedTo, search } = req.query;
    const { page, limit, skip } = sanitizePagination(
      Number(req.query.page),
      Number(req.query.limit)
    );

    const subordinateIds = await getSubordinateIds(
      currentUser._id.toString(),
      currentUser.role as UserRole
    );

    const filter: Record<string, unknown> = {
      assignedTo: { $in: subordinateIds.map((id) => new Types.ObjectId(id)) },
    };

    if (status && Object.values(TaskStatus).includes(status as TaskStatus)) {
      filter.status = status;
    }

    if (assignedTo && isValidObjectId(assignedTo as string)) {
      if (subordinateIds.includes(assignedTo as string)) {
        filter.assignedTo = new Types.ObjectId(assignedTo as string);
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignedTo', 'username email role')
        .populate('createdBy', 'username email role')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Tasks retrieved',
      data: {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };

    res.status(200).json(response);
  }
);

export const getTaskById = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate('assignedTo', 'username email role')
      .populate('createdBy', 'username email role');

    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    const subordinateIds = await getSubordinateIds(
      currentUser._id.toString(),
      currentUser.role as UserRole
    );

    if (!subordinateIds.includes(task.assignedTo._id.toString())) {
      throw ApiError.forbidden('You do not have access to this task');
    }

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
    const currentUser = req.user!;
    const { id } = req.params;
    const { title, description, status } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    const subordinateIds = await getSubordinateIds(
      currentUser._id.toString(),
      currentUser.role as UserRole
    );

    if (!subordinateIds.includes(task.assignedTo.toString())) {
      throw ApiError.forbidden('You do not have permission to update this task');
    }

    if (
      currentUser.role === UserRole.EMPLOYEE &&
      task.assignedTo.toString() !== currentUser._id.toString()
    ) {
      throw ApiError.forbidden('Employees can only modify their own tasks');
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'username email role')
      .populate('createdBy', 'username email role');

    await emitTaskEvent(
      'task:updated',
      { task: populated },
      task.assignedTo.toString()
    );

    const response: ApiResponse = {
      success: true,
      message: 'Task updated successfully',
      data: { task: populated },
    };

    res.status(200).json(response);
  }
);

export const deleteTask = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    const subordinateIds = await getSubordinateIds(
      currentUser._id.toString(),
      currentUser.role as UserRole
    );

    if (!subordinateIds.includes(task.assignedTo.toString())) {
      throw ApiError.forbidden('You do not have permission to delete this task');
    }

    if (
      currentUser.role === UserRole.EMPLOYEE &&
      task.assignedTo.toString() !== currentUser._id.toString()
    ) {
      throw ApiError.forbidden('Employees can only delete their own tasks');
    }

    const assignedToId = task.assignedTo.toString();
    await Task.findByIdAndDelete(id);

    await emitTaskEvent('task:deleted', { taskId: id }, assignedToId);

    const response: ApiResponse = {
      success: true,
      message: 'Task deleted successfully',
    };

    res.status(200).json(response);
  }
);

export const reassignTask = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (currentUser.role === UserRole.EMPLOYEE) {
      throw ApiError.forbidden('Employees cannot reassign tasks');
    }

    const task = await Task.findById(id);
    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    const subordinateIds = await getSubordinateIds(
      currentUser._id.toString(),
      currentUser.role as UserRole
    );

    if (!subordinateIds.includes(task.assignedTo.toString())) {
      throw ApiError.forbidden('You do not have access to this task');
    }

    if (!subordinateIds.includes(assignedTo)) {
      throw ApiError.forbidden(
        'Cannot reassign to a user outside your hierarchy'
      );
    }

    const targetUser = await User.findById(assignedTo);
    if (!targetUser) {
      throw ApiError.notFound('Target user not found');
    }

    const previousAssignee = task.assignedTo.toString();
    task.assignedTo = new Types.ObjectId(assignedTo);
    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'username email role')
      .populate('createdBy', 'username email role');

    await emitTaskEvent(
      'task:reassigned',
      { task: populated, previousAssignee },
      assignedTo,
      previousAssignee
    );

    const response: ApiResponse = {
      success: true,
      message: `Task reassigned to ${targetUser.username}`,
      data: { task: populated },
    };

    res.status(200).json(response);
  }
);

export const getTaskStats = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;

    const subordinateIds = await getSubordinateIds(
      currentUser._id.toString(),
      currentUser.role as UserRole
    );

    const objectIds = subordinateIds.map((id) => new Types.ObjectId(id));

    const stats = await Task.aggregate([
      { $match: { assignedTo: { $in: objectIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalTasks = stats.reduce(
      (sum: number, s: { count: number }) => sum + s.count,
      0
    );

    const formattedStats = {
      total: totalTasks,
      pending: 0,
      in_progress: 0,
      completed: 0,
    };

    stats.forEach((s: { _id: string; count: number }) => {
      if (s._id in formattedStats) {
        formattedStats[s._id as keyof typeof formattedStats] = s.count;
      }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Task statistics retrieved',
      data: { stats: formattedStats },
    };

    res.status(200).json(response);
  }
);
