import { Response } from 'express';
import User from '../models/User';
import Task from '../models/Task';
import { AuthRequest, UserRole, ApiResponse } from '../types';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { isValidObjectId } from '../utils/helpers';

const ADMIN_OR_MANAGER = [UserRole.ADMIN, UserRole.MANAGER];

export const getAllUsers = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;

    if (!ADMIN_OR_MANAGER.includes(currentUser.role as UserRole)) {
      throw ApiError.forbidden('Only admins and managers can view all users');
    }

    const users = await User.find({ _id: { $ne: currentUser._id } })
      .select('-password')
      .populate('managedBy', 'username email role')
      .sort({ role: 1, username: 1 });

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
    const currentUser = req.user!;
    let members;

    if (currentUser.role === UserRole.ADMIN) {
      const managers = await User.find({ role: UserRole.MANAGER })
        .select('-password')
        .lean();

      const managerIds = managers.map((m) => m._id);
      const teamLeads = await User.find({
        role: UserRole.TEAM_LEAD,
      })
        .select('-password')
        .lean();

      const teamLeadIds = teamLeads.map((tl) => tl._id);
      const employees = await User.find({
        role: UserRole.EMPLOYEE,
      })
        .select('-password')
        .lean();

      members = managers.map((mgr) => ({
        ...mgr,
        teamMembers: teamLeads
          .filter((tl) => tl.managedBy?.toString() === mgr._id.toString())
          .map((tl) => ({
            ...tl,
            teamMembers: employees.filter(
              (emp) => emp.managedBy?.toString() === tl._id.toString()
            ),
          })),
      }));
    } else if (currentUser.role === UserRole.MANAGER) {
      const teamLeads = await User.find({
        managedBy: currentUser._id,
        role: UserRole.TEAM_LEAD,
      })
        .select('-password')
        .lean();

      const teamLeadIds = teamLeads.map((tl) => tl._id);
      const employees = await User.find({
        managedBy: { $in: teamLeadIds },
        role: UserRole.EMPLOYEE,
      })
        .select('-password')
        .lean();

      members = teamLeads.map((tl) => ({
        ...tl,
        teamMembers: employees.filter(
          (emp) => emp.managedBy?.toString() === tl._id.toString()
        ),
      }));
    } else if (currentUser.role === UserRole.TEAM_LEAD) {
      members = await User.find({
        managedBy: currentUser._id,
        role: UserRole.EMPLOYEE,
      })
        .select('-password')
        .lean();
    } else {
      throw ApiError.forbidden('Employees cannot view team members');
    }

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

    const { role } = req.query;
    const filter: Record<string, unknown> = { managedBy: null };

    if (role === UserRole.MANAGER) {
      filter.role = UserRole.MANAGER;
    } else if (role === UserRole.TEAM_LEAD) {
      filter.role = UserRole.TEAM_LEAD;
    } else if (role === UserRole.EMPLOYEE) {
      filter.role = UserRole.EMPLOYEE;
    } else {
      filter.role = { $in: [UserRole.MANAGER, UserRole.TEAM_LEAD, UserRole.EMPLOYEE] };
    }

    const users = await User.find(filter).select('-password').sort({ username: 1 });

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
    const isAdmin = caller.role === UserRole.ADMIN;
    const isManager = caller.role === UserRole.MANAGER;

    if (!isAdmin && !isManager) {
      throw ApiError.forbidden('Only admins and managers can assign users');
    }

    const id = req.params.id as string;
    const { managedBy } = req.body;

    if (!isValidObjectId(id)) {
      throw ApiError.badRequest('Invalid user ID');
    }

    const userToAssign = await User.findById(id);
    if (!userToAssign) {
      throw ApiError.notFound('User not found');
    }

    if (userToAssign.role === UserRole.ADMIN) {
      throw ApiError.badRequest('Cannot assign an admin to another user');
    }

    if (userToAssign.role === UserRole.MANAGER) {
      if (!isAdmin) {
        throw ApiError.forbidden('Only admins can assign managers');
      }
      // Managers don't need managedBy -- they are top-level under admin
      // But we allow admin to set it for org tracking
      if (managedBy && isValidObjectId(managedBy)) {
        userToAssign.managedBy = null; // Managers stay at top level
      }
      // Nothing to do -- managers are already independent
      const response: ApiResponse = {
        success: true,
        message: `Manager '${userToAssign.username}' is a top-level role`,
        data: { user: userToAssign },
      };
      res.status(200).json(response);
      return;
    }

    if (userToAssign.role === UserRole.TEAM_LEAD) {
      if (!managedBy || !isValidObjectId(managedBy)) {
        throw ApiError.badRequest('Please provide a valid manager ID');
      }

      const targetManager = await User.findById(managedBy);
      if (!targetManager || targetManager.role !== UserRole.MANAGER) {
        throw ApiError.badRequest('Team leads can only be assigned to a manager');
      }

      if (isManager && managedBy !== caller._id.toString()) {
        throw ApiError.forbidden(
          'Managers can only assign team leads to themselves'
        );
      }

      userToAssign.managedBy = targetManager._id;
    } else if (userToAssign.role === UserRole.EMPLOYEE) {
      if (!managedBy || !isValidObjectId(managedBy)) {
        throw ApiError.badRequest('Please provide a valid team lead ID');
      }

      const teamLead = await User.findById(managedBy);
      if (!teamLead || teamLead.role !== UserRole.TEAM_LEAD) {
        throw ApiError.badRequest('Employees can only be assigned to a team lead');
      }

      if (isManager && teamLead.managedBy?.toString() !== caller._id.toString()) {
        throw ApiError.forbidden(
          'Can only assign employees to team leads under your management'
        );
      }

      userToAssign.managedBy = teamLead._id;
    }

    await userToAssign.save();

    const populated = await User.findById(userToAssign._id)
      .select('-password')
      .populate('managedBy', 'username email role');

    const response: ApiResponse = {
      success: true,
      message: `User '${userToAssign.username}' has been assigned successfully`,
      data: { user: populated },
    };

    res.status(200).json(response);
  }
);

export const unassignUser = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!ADMIN_OR_MANAGER.includes(req.user!.role as UserRole)) {
      throw ApiError.forbidden('Only admins and managers can unassign users');
    }

    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      throw ApiError.badRequest('Invalid user ID');
    }

    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.role === UserRole.TEAM_LEAD) {
      const employees = await User.find({ managedBy: user._id });
      if (employees.length > 0) {
        throw ApiError.badRequest(
          'Cannot unassign a team lead who still has employees. Reassign employees first.'
        );
      }
    }

    if (user.role === UserRole.MANAGER) {
      const teamLeads = await User.find({ managedBy: user._id });
      if (teamLeads.length > 0) {
        throw ApiError.badRequest(
          'Cannot unassign a manager who still has team leads. Reassign team leads first.'
        );
      }
    }

    user.managedBy = null;
    await user.save();

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
    const currentUser = req.user!;
    let users;

    if (currentUser.role === UserRole.ADMIN) {
      users = await User.find()
        .select('_id username email role')
        .sort({ role: 1, username: 1 });
    } else if (currentUser.role === UserRole.MANAGER) {
      const teamLeads = await User.find({ managedBy: currentUser._id }).select('_id');
      const teamLeadIds = teamLeads.map((tl) => tl._id);

      users = await User.find({
        $or: [
          { _id: currentUser._id },
          { managedBy: currentUser._id },
          { managedBy: { $in: teamLeadIds } },
        ],
      })
        .select('_id username email role')
        .sort({ role: 1, username: 1 });
    } else if (currentUser.role === UserRole.TEAM_LEAD) {
      users = await User.find({
        $or: [
          { _id: currentUser._id },
          { managedBy: currentUser._id, role: UserRole.EMPLOYEE },
        ],
      })
        .select('_id username email role')
        .sort({ role: 1, username: 1 });
    } else {
      users = [
        {
          _id: currentUser._id,
          username: currentUser.username,
          email: currentUser.email,
          role: currentUser.role,
        },
      ];
    }

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

    const id = req.params.id as string;
    const { role } = req.body;

    if (!isValidObjectId(id)) {
      throw ApiError.badRequest('Invalid user ID');
    }

    if (!Object.values(UserRole).includes(role)) {
      throw ApiError.badRequest('Invalid role');
    }

    if (id === req.user!._id.toString()) {
      throw ApiError.badRequest('Cannot change your own role');
    }

    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const oldRole = user.role;

    if (user.role === UserRole.TEAM_LEAD && role !== UserRole.TEAM_LEAD) {
      const employees = await User.find({ managedBy: user._id });
      if (employees.length > 0) {
        throw ApiError.badRequest(
          'Cannot change role of a team lead who has employees. Reassign employees first.'
        );
      }
    }

    if (user.role === UserRole.MANAGER && role !== UserRole.MANAGER) {
      const teamLeads = await User.find({ managedBy: user._id });
      if (teamLeads.length > 0) {
        throw ApiError.badRequest(
          'Cannot change role of a manager who has team leads. Reassign team leads first.'
        );
      }
    }

    user.role = role;
    user.managedBy = null;
    await user.save();

    const response: ApiResponse = {
      success: true,
      message: `User '${user.username}' role changed from ${oldRole} to ${role}`,
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

    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      throw ApiError.badRequest('Invalid user ID');
    }

    if (id === req.user!._id.toString()) {
      throw ApiError.badRequest('Cannot delete your own account');
    }

    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const subordinates = await User.find({ managedBy: user._id });
    if (subordinates.length > 0) {
      throw ApiError.badRequest(
        'Cannot delete a user who has subordinates. Reassign them first.'
      );
    }

    await Task.deleteMany({ assignedTo: user._id });
    await Task.updateMany(
      { createdBy: user._id },
      { $set: { createdBy: req.user!._id } }
    );

    await User.findByIdAndDelete(id);

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

    const stats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const formatted: Record<string, number> = {
      total: 0,
      admin: 0,
      manager: 0,
      team_lead: 0,
      employee: 0,
    };

    stats.forEach((s: { _id: string; count: number }) => {
      if (s._id in formatted) {
        formatted[s._id] = s.count;
      }
      formatted['total'] += s.count;
    });

    const response: ApiResponse = {
      success: true,
      message: 'User statistics retrieved',
      data: { stats: formatted },
    };

    res.status(200).json(response);
  }
);
