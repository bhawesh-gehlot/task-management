import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { JwtPayload, UserRole } from '../types';

let io: SocketServer;

export const initializeSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:4200',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || ''
      ) as JwtPayload;

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user;
    console.log(`Socket connected: ${user.username} (${user.role})`);

    socket.join(`user:${user._id}`);

    if (user.role === UserRole.ADMIN) {
      socket.join('admin:global');
    }

    if (user.role === UserRole.TEAM_LEAD) {
      socket.join(`team:${user._id}`);
    }

    if (user.role === UserRole.EMPLOYEE && user.managedBy) {
      socket.join(`team:${user.managedBy}`);
    }

    if (user.role === UserRole.MANAGER) {
      socket.join(`manager:${user._id}`);
    }

    if (user.role === UserRole.TEAM_LEAD && user.managedBy) {
      socket.join(`manager:${user.managedBy}`);
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${user.username}`);
    });
  });

  return io;
};

export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const emitTaskEvent = async (
  event: string,
  taskData: Record<string, unknown>,
  assignedToId: string,
  previousAssigneeId?: string
): Promise<void> => {
  if (!io) return;

  const assignedUser = await User.findById(assignedToId);
  if (!assignedUser) return;

  io.to(`user:${assignedToId}`).emit(event, taskData);
  io.to('admin:global').emit(event, taskData);

  if (assignedUser.managedBy) {
    io.to(`team:${assignedUser.managedBy}`).emit(event, taskData);

    const teamLead = await User.findById(assignedUser.managedBy);
    if (teamLead?.managedBy) {
      io.to(`manager:${teamLead.managedBy}`).emit(event, taskData);
    }
  }

  if (assignedUser.role === UserRole.TEAM_LEAD && assignedUser.managedBy) {
    io.to(`manager:${assignedUser.managedBy}`).emit(event, taskData);
  }

  if (previousAssigneeId && previousAssigneeId !== assignedToId) {
    io.to(`user:${previousAssigneeId}`).emit(event, taskData);
  }
};
