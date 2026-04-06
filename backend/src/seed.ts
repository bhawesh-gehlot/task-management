import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from './models/User';
import Task from './models/Task';
import { UserRole, TaskStatus } from './types';

const seedDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await Task.deleteMany({});
    console.log('Cleared existing data');

    const admin = await User.create({
      username: 'admin',
      email: 'admin@test.com',
      password: 'Password123',
      role: UserRole.ADMIN,
    });

    const manager = await User.create({
      username: 'manager1',
      email: 'manager@test.com',
      password: 'Password123',
      role: UserRole.MANAGER,
    });

    const teamLead1 = await User.create({
      username: 'teamlead1',
      email: 'teamlead1@test.com',
      password: 'Password123',
      role: UserRole.TEAM_LEAD,
      managedBy: manager._id,
    });

    const teamLead2 = await User.create({
      username: 'teamlead2',
      email: 'teamlead2@test.com',
      password: 'Password123',
      role: UserRole.TEAM_LEAD,
      managedBy: manager._id,
    });

    const emp1 = await User.create({
      username: 'employee1',
      email: 'employee1@test.com',
      password: 'Password123',
      role: UserRole.EMPLOYEE,
      managedBy: teamLead1._id,
    });

    const emp2 = await User.create({
      username: 'employee2',
      email: 'employee2@test.com',
      password: 'Password123',
      role: UserRole.EMPLOYEE,
      managedBy: teamLead1._id,
    });

    const emp3 = await User.create({
      username: 'employee3',
      email: 'employee3@test.com',
      password: 'Password123',
      role: UserRole.EMPLOYEE,
      managedBy: teamLead2._id,
    });

    const emp4 = await User.create({
      username: 'employee4',
      email: 'employee4@test.com',
      password: 'Password123',
      role: UserRole.EMPLOYEE,
      managedBy: teamLead2._id,
    });

    await Task.insertMany([
      {
        title: 'Set up project architecture',
        description: 'Define folder structure and initialize the project',
        status: TaskStatus.COMPLETED,
        assignedTo: teamLead1._id,
        createdBy: manager._id,
      },
      {
        title: 'Design database schema',
        description: 'Create MongoDB schemas for users and tasks',
        status: TaskStatus.IN_PROGRESS,
        assignedTo: teamLead1._id,
        createdBy: manager._id,
      },
      {
        title: 'Implement authentication API',
        description: 'Build JWT-based login and registration endpoints',
        status: TaskStatus.PENDING,
        assignedTo: emp1._id,
        createdBy: teamLead1._id,
      },
      {
        title: 'Build task CRUD endpoints',
        description: 'Create REST API for task management operations',
        status: TaskStatus.PENDING,
        assignedTo: emp2._id,
        createdBy: teamLead1._id,
      },
      {
        title: 'Create Angular components',
        description: 'Build reusable UI components with Angular Material',
        status: TaskStatus.IN_PROGRESS,
        assignedTo: emp3._id,
        createdBy: teamLead2._id,
      },
      {
        title: 'Write unit tests',
        description: 'Add unit tests for backend services and controllers',
        status: TaskStatus.PENDING,
        assignedTo: emp4._id,
        createdBy: teamLead2._id,
      },
      {
        title: 'Setup CI/CD pipeline',
        description: 'Configure automated deployment pipeline',
        status: TaskStatus.PENDING,
        assignedTo: teamLead2._id,
        createdBy: manager._id,
      },
      {
        title: 'Code review sprint tasks',
        description: 'Review all pending pull requests for sprint',
        status: TaskStatus.PENDING,
        assignedTo: manager._id,
        createdBy: manager._id,
      },
    ]);

    console.log('Seed data created successfully!');
    console.log('\nTest Credentials:');
    console.log('Admin:       admin@test.com      / Password123');
    console.log('Manager:     manager@test.com    / Password123');
    console.log('Team Lead 1: teamlead1@test.com  / Password123');
    console.log('Team Lead 2: teamlead2@test.com  / Password123');
    console.log('Employee 1:  employee1@test.com  / Password123');
    console.log('Employee 2:  employee2@test.com  / Password123');
    console.log('Employee 3:  employee3@test.com  / Password123');
    console.log('Employee 4:  employee4@test.com  / Password123');
  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

seedDatabase();
