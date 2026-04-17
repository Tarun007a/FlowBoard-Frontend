import { Visibility } from './workspace.models';

export interface BoardRequest {
  workspaceId: number;
  name: string;
  description: string;
  background: string;
  visibility: Visibility;
}

export interface BoardUpdateRequest extends BoardRequest {}

export interface BoardResponse {
  boardId: number;
  workspaceId: number;
  name: string;
  description: string;
  background: string;
  visibility: Visibility;
  createdById: number;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardMemberRequest {
  boardId: number;
  userId: number;
}

export interface BoardMemberResponse {
  boardMemberId: number;
  boardId: number;
  userId: number;
  role: string;
  addedAt: string;
}