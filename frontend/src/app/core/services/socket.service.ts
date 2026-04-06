import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { Task } from '../models';

export interface TaskEvent {
  task?: Task;
  taskId?: string;
  previousAssignee?: string;
}

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;

  private taskCreatedSubject = new Subject<TaskEvent>();
  private taskUpdatedSubject = new Subject<TaskEvent>();
  private taskDeletedSubject = new Subject<TaskEvent>();
  private taskReassignedSubject = new Subject<TaskEvent>();

  readonly taskCreated$ = this.taskCreatedSubject.asObservable();
  readonly taskUpdated$ = this.taskUpdatedSubject.asObservable();
  readonly taskDeleted$ = this.taskDeletedSubject.asObservable();
  readonly taskReassigned$ = this.taskReassignedSubject.asObservable();

  constructor(private authService: AuthService) {}

  connect(): void {
    const token = this.authService.getToken();
    if (!token || this.socket?.connected) return;

    this.socket = io(environment.socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('task:created', (data: TaskEvent) => {
      this.taskCreatedSubject.next(data);
    });

    this.socket.on('task:updated', (data: TaskEvent) => {
      this.taskUpdatedSubject.next(data);
    });

    this.socket.on('task:deleted', (data: TaskEvent) => {
      this.taskDeletedSubject.next(data);
    });

    this.socket.on('task:reassigned', (data: TaskEvent) => {
      this.taskReassignedSubject.next(data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.taskCreatedSubject.complete();
    this.taskUpdatedSubject.complete();
    this.taskDeletedSubject.complete();
    this.taskReassignedSubject.complete();
  }
}
