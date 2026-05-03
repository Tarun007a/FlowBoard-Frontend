export type Visibility = 'PUBLIC' | 'PRIVATE';

export interface WorkspaceRequest {
  name: string;
  description: string;
  visibility: Visibility;
  logoUrl?: string | null;
}

export interface WorkspaceResponse {
  workspaceId: number;
  name: string;
  description: string;
  ownerId: number;
  visibility: Visibility;
  logoUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberRequest {
  workspaceId: number;
  userId: number;
}

export interface WorkspaceMemberResponse {
  memberId: number;
  workspaceId: number;
  userId: number;
  joinedAt: string;
}
