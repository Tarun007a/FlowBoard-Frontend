export type AnalyticsStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type AnalyticsStatusFilter = 'ALL' | AnalyticsStatus;
export type DueFilter = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'OVERDUE';

export interface CardStatusSummaryDto {
  toDo: number;
  overdueCards: number;
  inProgress: number;
  inReview: number;
  done: number;
  total: number;
  completionRate: number;
}

export interface WorkspaceOverviewDto {
  workspaceId: number;
  name: string;
  logoUrl: string | null;
  isOwner: boolean;
  totalBoards: number;
  totalMembers: number;
  cardsSummary: CardStatusSummaryDto;
}

export interface WorkspaceAnalyticsResponseDto {
  workspaceId: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
  visibility: string;
  createdAt: string;
  totalBoards: number;
  totalLists: number;
  totalMembers: number;
  cardsSummary: CardStatusSummaryDto;
}

export interface WorkspaceMemberDto {
  memberId: number;
  workspaceId: number;
  userId: number;
  joinedAt: string;
}

export interface BoardDto {
  boardId: number;
  workspaceId: number;
  name: string;
  description: string | null;
  visibility: string;
  isClosed: boolean;
  createdAt: string;
}

export interface MemberAnalyticsDto {
  userId: number;
  name: string;
  email: string;
  profilePicture: string | null;
  totalPending: number;
  cardsSummary: CardStatusSummaryDto;
}

export interface BoardAnalyticsDto {
  boardId: number;
  name: string;
  visibility: string;
  isClosed: boolean;
  totalLists: number;
  cardsSummary: CardStatusSummaryDto;
}

export interface ListDto {
  listId: number;
  boardId: number;
  name: string;
  position: number;
}

export interface CardDto {
  cardId: number;
  listId: number;
  boardId: number;
  title: string;
  description: string | null;
  position: number;
  priority: string;
  status: string;
  dueDate: string | null;
  startDate: string | null;
  assigneeId: number | null;
  createdById: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
