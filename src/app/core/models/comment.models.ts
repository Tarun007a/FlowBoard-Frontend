export interface CommentRequest {
  cardId: number;
  authorId: number;
  content: string;
  parentCommentId: number | null;
}

export interface CommentUpdateRequest {
  commentId: number;
  content: string;
}

export interface CommentResponse {
  commentId: number;
  cardId: number;
  authorId: number;
  content: string;
  isDeleted: boolean;
  parentCommentId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentResponse {
  attachmentId: number;
  cardId: number;
  uploaderId: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  sizeKb: number;
  uploadedAt: string;
}