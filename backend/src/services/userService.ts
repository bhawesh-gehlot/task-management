import User from '../models/User';
import Task from '../models/Task';
import { IUser, UserRole } from '../types';
import { ApiError } from '../utils/ApiError';
import { isValidObjectId } from '../utils/helpers';

export const fetchAllUsers = async (caller: IUser) => {
  if (caller.role === UserRole.ADMIN) {
    return User.find({ _id: { $ne: caller._id } })
      .select('-password')
      .populate('managedBy', 'username email role')
      .sort({ role: 1, username: 1 });
  }

  const teamLeads = await User.find({
    managedBy: caller._id,
    role: UserRole.TEAM_LEAD,
  }).select('_id');
  const teamLeadIds = teamLeads.map((tl) => tl._id);

  return User.find({
    $or: [
      { managedBy: caller._id },
      { managedBy: { $in: teamLeadIds } },
    ],
  })
    .select('-password')
    .populate('managedBy', 'username email role')
    .sort({ role: 1, username: 1 });
};

export const fetchTeamMembers = async (caller: IUser) => {
  if (caller.role === UserRole.ADMIN) {
    const managers = await User.find({ role: UserRole.MANAGER })
      .select('-password')
      .lean();
    const teamLeads = await User.find({ role: UserRole.TEAM_LEAD })
      .select('-password')
      .lean();
    const employees = await User.find({ role: UserRole.EMPLOYEE })
      .select('-password')
      .lean();

    return managers.map((mgr) => ({
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
  }

  if (caller.role === UserRole.MANAGER) {
    const teamLeads = await User.find({
      managedBy: caller._id,
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

    return teamLeads.map((tl) => ({
      ...tl,
      teamMembers: employees.filter(
        (emp) => emp.managedBy?.toString() === tl._id.toString()
      ),
    }));
  }

  if (caller.role === UserRole.TEAM_LEAD) {
    return User.find({
      managedBy: caller._id,
      role: UserRole.EMPLOYEE,
    })
      .select('-password')
      .lean();
  }

  throw ApiError.forbidden('Employees cannot view team members');
};

export const fetchUnassignedUsers = async (role?: string) => {
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

  return User.find(filter).select('-password').sort({ username: 1 });
};

export const assignUserToManager = async (
  userId: string,
  managedBy: string,
  caller: IUser
) => {
  const isAdmin = caller.role === UserRole.ADMIN;
  const isManager = caller.role === UserRole.MANAGER;

  if (!isValidObjectId(userId)) {
    throw ApiError.badRequest('Invalid user ID');
  }

  const userToAssign = await User.findById(userId);
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
    return { user: userToAssign, message: `Manager '${userToAssign.username}' is a top-level role` };
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
      throw ApiError.forbidden('Managers can only assign team leads to themselves');
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
      throw ApiError.forbidden('Can only assign employees to team leads under your management');
    }
    userToAssign.managedBy = teamLead._id;
  }

  await userToAssign.save();

  const populated = await User.findById(userToAssign._id)
    .select('-password')
    .populate('managedBy', 'username email role');

  return { user: populated, message: `User '${userToAssign.username}' has been assigned successfully` };
};

export const unassignUserFromTeam = async (userId: string, caller: IUser) => {
  if (!isValidObjectId(userId)) {
    throw ApiError.badRequest('Invalid user ID');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (caller.role === UserRole.MANAGER) {
    if (user.role === UserRole.TEAM_LEAD) {
      if (user.managedBy?.toString() !== caller._id.toString()) {
        throw ApiError.forbidden('You can only unassign team leads from your own team');
      }
    } else if (user.role === UserRole.EMPLOYEE) {
      const teamLead = user.managedBy ? await User.findById(user.managedBy) : null;
      if (!teamLead || teamLead.managedBy?.toString() !== caller._id.toString()) {
        throw ApiError.forbidden('You can only unassign employees from your own team');
      }
    } else {
      throw ApiError.forbidden('Managers cannot unassign this user');
    }
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

  return user;
};

export const fetchAssignableUsers = async (caller: IUser) => {
  if (caller.role === UserRole.ADMIN) {
    return User.find()
      .select('_id username email role')
      .sort({ role: 1, username: 1 });
  }

  if (caller.role === UserRole.MANAGER) {
    const teamLeads = await User.find({ managedBy: caller._id }).select('_id');
    const teamLeadIds = teamLeads.map((tl) => tl._id);

    return User.find({
      $or: [
        { _id: caller._id },
        { managedBy: caller._id },
        { managedBy: { $in: teamLeadIds } },
      ],
    })
      .select('_id username email role')
      .sort({ role: 1, username: 1 });
  }

  if (caller.role === UserRole.TEAM_LEAD) {
    return User.find({
      $or: [
        { _id: caller._id },
        { managedBy: caller._id, role: UserRole.EMPLOYEE },
      ],
    })
      .select('_id username email role')
      .sort({ role: 1, username: 1 });
  }

  return [{
    _id: caller._id,
    username: caller.username,
    email: caller.email,
    role: caller.role,
  }];
};

export const updateUserRole = async (
  userId: string,
  newRole: UserRole,
  callerId: string
) => {
  if (!isValidObjectId(userId)) {
    throw ApiError.badRequest('Invalid user ID');
  }
  if (!Object.values(UserRole).includes(newRole)) {
    throw ApiError.badRequest('Invalid role');
  }
  if (userId === callerId) {
    throw ApiError.badRequest('Cannot change your own role');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const oldRole = user.role;

  if (user.role === UserRole.TEAM_LEAD && newRole !== UserRole.TEAM_LEAD) {
    const employees = await User.find({ managedBy: user._id });
    if (employees.length > 0) {
      throw ApiError.badRequest(
        'Cannot change role of a team lead who has employees. Reassign employees first.'
      );
    }
  }

  if (user.role === UserRole.MANAGER && newRole !== UserRole.MANAGER) {
    const teamLeads = await User.find({ managedBy: user._id });
    if (teamLeads.length > 0) {
      throw ApiError.badRequest(
        'Cannot change role of a manager who has team leads. Reassign team leads first.'
      );
    }
  }

  user.role = newRole;
  user.managedBy = null;
  await user.save();

  return { user, oldRole };
};

export const removeUser = async (userId: string, callerId: string) => {
  if (!isValidObjectId(userId)) {
    throw ApiError.badRequest('Invalid user ID');
  }
  if (userId === callerId) {
    throw ApiError.badRequest('Cannot delete your own account');
  }

  const user = await User.findById(userId);
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
    { $set: { createdBy: callerId } }
  );
  await User.findByIdAndDelete(userId);

  return user;
};

export const fetchUserStats = async () => {
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

  return formatted;
};
