export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Status = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export interface CardRequest {
  listId: number;
  boardId: number;
  title: string;
  description: string;
  priority: Priority | null;
  status: Status | null;
  dueDate: string | null;
  startDate: string | null;
  assigneeId: number | null;
}

export interface CardUpdateRequest {
  title: string;
  description: string;
  priority: Priority | null;
  status: Status | null;
  dueDate: string | null;
  startDate: string | null;
}

export interface CardResponse {
  cardId: number;
  listId: number;
  boardId: number;
  title: string;
  description: string;
  position: number;
  priority: Priority | null;
  status: Status | null;
  dueDate: string | null;
  startDate: string | null;
  assigneeId: number | null;
  createdById: number;
  isArchived: boolean;
  coverColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardActivityResponse {
  activityId: number;
  cardId: number;
  actorId: number;
  activityType: string;
  details: string;
  createdAt: string;
}