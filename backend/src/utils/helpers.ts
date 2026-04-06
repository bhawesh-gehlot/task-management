import { Types } from 'mongoose';
import User from '../models/User';
import { UserRole } from '../types';

export const getSubordinateIds = async (
  userId: string,
  role: UserRole
): Promise<string[]> => {
  if (role === UserRole.ADMIN) {
    const allUsers = await User.find().select('_id');
    return allUsers.map((u) => u._id.toString());
  }

  const ids: string[] = [userId];

  if (role === UserRole.MANAGER) {
    const teamLeads = await User.find({ managedBy: userId }).select('_id');
    const teamLeadIds = teamLeads.map((tl) => tl._id.toString());
    ids.push(...teamLeadIds);

    if (teamLeadIds.length > 0) {
      const employees = await User.find({
        managedBy: { $in: teamLeadIds.map((id) => new Types.ObjectId(id)) },
      }).select('_id');
      ids.push(...employees.map((e) => e._id.toString()));
    }
  }

  if (role === UserRole.TEAM_LEAD) {
    const employees = await User.find({ managedBy: userId }).select('_id');
    ids.push(...employees.map((e) => e._id.toString()));
  }

  return [...new Set(ids)];
};

export const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

export const sanitizePagination = (
  page?: number,
  limit?: number
): { page: number; limit: number; skip: number } => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};
