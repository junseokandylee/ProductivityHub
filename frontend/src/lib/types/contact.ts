export interface Contact {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  kakaoId: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactSearchParams {
  search?: string;
  isActive?: boolean;
  tagIds?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  afterUpdatedAt?: string;
  afterId?: string;
}

export interface ContactSearchResponse {
  contacts: Contact[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  nextUpdatedAt: string | null;
  nextId: string | null;
}

export interface CreateContactRequest {
  fullName: string;
  phone?: string;
  email?: string;
  kakaoId?: string;
  notes?: string;
  tagIds?: string[];
}

export interface UpdateContactRequest extends CreateContactRequest {
  isActive: boolean;
}

export interface ContactHistory {
  id: string;
  contactId: string;
  type: 'created' | 'updated' | 'imported' | 'merged' | 'tag_added' | 'tag_removed' | 'message_sent' | 'deactivated' | 'reactivated';
  description: string;
  metadata: Record<string, any> | null;
  userId: string | null;
  userName: string | null;
  createdAt: string;
}

export interface ContactHistorySearchRequest {
  contactId: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}