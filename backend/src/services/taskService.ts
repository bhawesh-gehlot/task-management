import { Types } from 'mongoose';
import Task from '../models/Task';
import User from '../models/User';
import { IUser, ITask, UserRole, TaskStatus } from '../types';
import { ApiError } from '../utils/ApiError';
import { getSubordinateIds, sanitizePagination, isValidObjectId } from '../utils/helpers';
import { emitTaskEvent } from '../config/socket';

export const createTask = async (
  caller: IUser,
  data: { title: string; description?: string; status?: TaskStatus; assignedTo?: string }
): Promise<ITask> => {
  const { title, description, status, assignedTo } = data;
  let assigneeId = caller._id.toString();

  if (caller.role === UserRole.EMPLOYEE) {
    assigneeId = caller._id.toString();
  } else if (assignedTo) {
    if (!isValidObjectId(assignedTo)) {
      throw ApiError.badRequest('Invalid assignee ID');
    }

    const subordinateIds = await getSubordinateIds(
      caller._id.toString(),
      caller.role as UserRole
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
    createdBy: caller._id,
  });

  const populated = await Task.findById(task._id)
    .populate('assignedTo', 'username email role')
    .populate('createdBy', 'username email role');

  await emitTaskEvent('task:created', { task: populated }, assigneeId);

  return populated!;
};

export const fetchTasks = async (
  caller: IUser,
  query: {
    status?: string;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
) => {
  const { status, assignedTo, search } = query;
  const { page, limit, skip } = sanitizePagination(query.page, query.limit);

  const subordinateIds = await getSubordinateIds(
    caller._id.toString(),
    caller.role as UserRole
  );

  const filter: Record<string, unknown> = {
    assignedTo: { $in: subordinateIds.map((id) => new Types.ObjectId(id)) },
  };

  if (status && Object.values(TaskStatus).includes(status as TaskStatus)) {
    filter.status = status;
  }

  if (assignedTo && isValidObjectId(assignedTo)) {
    if (subordinateIds.includes(assignedTo)) {
      filter.assignedTo = new Types.ObjectId(assignedTo);
    }
  }

  if (search && search.trim()) {
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

  return {
    tasks,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const fetchTaskById = async (taskId: string, caller: IUser): Promise<ITask> => {
  const task = await Task.findById(taskId)
    .populate('assignedTo', 'username email role')
    .populate('createdBy', 'username email role');

  if (!task) {
    throw ApiError.notFound('Task not found');
  }

  const subordinateIds = await getSubordinateIds(
    caller._id.toString(),
    caller.role as UserRole
  );

  if (!subordinateIds.includes(task.assignedTo._id.toString())) {
    throw ApiError.forbidden('You do not have access to this task');
  }

  return task;
};

export const updateTask = async (
  taskId: string,
  caller: IUser,
  data: { title?: string; description?: string; status?: TaskStatus }
): Promise<ITask> => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw ApiError.notFound('Task not found');
  }

  const subordinateIds = await getSubordinateIds(
    caller._id.toString(),
    caller.role as UserRole
  );

  if (!subordinateIds.includes(task.assignedTo.toString())) {
    throw ApiError.forbidden('You do not have permission to update this task');
  }

  if (
    caller.role === UserRole.EMPLOYEE &&
    task.assignedTo.toString() !== caller._id.toString()
  ) {
    throw ApiError.forbidden('Employees can only modify their own tasks');
  }

  if (data.title !== undefined) task.title = data.title;
  if (data.description !== undefined) task.description = data.description;
  if (data.status !== undefined) task.status = data.status;

  await task.save();

  const populated = await Task.findById(task._id)
    .populate('assignedTo', 'username email role')
    .populate('createdBy', 'username email role');

  await emitTaskEvent('task:updated', { task: populated }, task.assignedTo.toString());

  return populated!;
};

export const deleteTask = async (taskId: string, caller: IUser): Promise<void> => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw ApiError.notFound('Task not found');
  }

  const subordinateIds = await getSubordinateIds(
    caller._id.toString(),
    caller.role as UserRole
  );

  if (!subordinateIds.includes(task.assignedTo.toString())) {
    throw ApiError.forbidden('You do not have permission to delete this task');
  }

  if (
    caller.role === UserRole.EMPLOYEE &&
    task.assignedTo.toString() !== caller._id.toString()
  ) {
    throw ApiError.forbidden('Employees can only delete their own tasks');
  }

  const assignedToId = task.assignedTo.toString();
  await Task.findByIdAndDelete(taskId);
  await emitTaskEvent('task:deleted', { taskId }, assignedToId);
};

export const reassignTask = async (
  taskId: string,
  caller: IUser,
  newAssigneeId: string
): Promise<ITask> => {
  if (caller.role === UserRole.EMPLOYEE) {
    throw ApiError.forbidden('Employees cannot reassign tasks');
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw ApiError.notFound('Task not found');
  }

  const subordinateIds = await getSubordinateIds(
    caller._id.toString(),
    caller.role as UserRole
  );

  if (!subordinateIds.includes(task.assignedTo.toString())) {
    throw ApiError.forbidden('You do not have access to this task');
  }

  if (!subordinateIds.includes(newAssigneeId)) {
    throw ApiError.forbidden('Cannot reassign to a user outside your hierarchy');
  }

  const targetUser = await User.findById(newAssigneeId);
  if (!targetUser) {
    throw ApiError.notFound('Target user not found');
  }

  const previousAssignee = task.assignedTo.toString();
  task.assignedTo = new Types.ObjectId(newAssigneeId);
  await task.save();

  const populated = await Task.findById(task._id)
    .populate('assignedTo', 'username email role')
    .populate('createdBy', 'username email role');

  await emitTaskEvent(
    'task:reassigned',
    { task: populated, previousAssignee },
    newAssigneeId,
    previousAssignee
  );

  return populated!;
};

export const fetchTaskStats = async (caller: IUser) => {
  const subordinateIds = await getSubordinateIds(
    caller._id.toString(),
    caller.role as UserRole
  );

  const objectIds = subordinateIds.map((id) => new Types.ObjectId(id));

  const stats = await Task.aggregate([
    { $match: { assignedTo: { $in: objectIds } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const formatted = {
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
  };

  stats.forEach((s: { _id: string; count: number }) => {
    if (s._id in formatted) {
      formatted[s._id as keyof typeof formatted] = s.count;
    }
    formatted.total += s.count;
  });

  return formatted;
};
