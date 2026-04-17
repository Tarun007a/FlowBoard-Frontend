export interface TaskListRequest {
  boardId: number;
  name: string;
  color: string;
}

export interface TaskListUpdateRequest {
  name: string;
  color: string;
}

export interface TaskListOrderRequest {
  taskListId: number;
  position: number;
}

export interface TaskListResponse {
  listId: number;
  boardId: string;
  name: string;
  position: number;
  color: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}