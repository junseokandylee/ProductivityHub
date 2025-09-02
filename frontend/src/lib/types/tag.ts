export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagRequest {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateTagRequest {
  name: string;
  color: string;
  description?: string;
}

export interface AssignTagRequest {
  tagId: string;
}

export interface BulkTagOperationRequest {
  contactIds: string[];
  tagId: string;
  action: 'add' | 'remove';
}

export interface BulkTagOperationResponse {
  processedContacts: number;
  successfulOperations: number;
  failedOperations: number;
  errors: string[];
}

// Predefined colors for tag selection
export const TAG_COLORS = [
  '#6B7280', // Gray
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
] as const;

export type TagColor = typeof TAG_COLORS[number];