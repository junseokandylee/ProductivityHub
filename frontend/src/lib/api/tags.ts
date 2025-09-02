import axios from 'axios';
import { 
  Tag, 
  CreateTagRequest, 
  UpdateTagRequest, 
  AssignTagRequest,
  BulkTagOperationRequest,
  BulkTagOperationResponse 
} from '@/lib/types/tag';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5284';

// Create axios instance with auth token
const createAuthenticatedRequest = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('auth-token');
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });
};

export const tagsAPI = {
  /**
   * Get all tags
   */
  getTags: async (): Promise<Tag[]> => {
    const api = createAuthenticatedRequest();
    const response = await api.get('/api/tags');
    return response.data;
  },

  /**
   * Get a specific tag by ID
   */
  getTag: async (id: string): Promise<Tag> => {
    const api = createAuthenticatedRequest();
    const response = await api.get(`/api/tags/${id}`);
    return response.data;
  },

  /**
   * Create a new tag
   */
  createTag: async (request: CreateTagRequest): Promise<Tag> => {
    const api = createAuthenticatedRequest();
    const response = await api.post('/api/tags', request);
    return response.data;
  },

  /**
   * Update an existing tag
   */
  updateTag: async (id: string, request: UpdateTagRequest): Promise<Tag> => {
    const api = createAuthenticatedRequest();
    const response = await api.put(`/api/tags/${id}`, request);
    return response.data;
  },

  /**
   * Delete a tag
   */
  deleteTag: async (id: string): Promise<void> => {
    const api = createAuthenticatedRequest();
    await api.delete(`/api/tags/${id}`);
  },

  /**
   * Assign a tag to a contact
   */
  assignTagToContact: async (contactId: string, request: AssignTagRequest): Promise<void> => {
    const api = createAuthenticatedRequest();
    await api.post(`/api/contacts/${contactId}/tags`, request);
  },

  /**
   * Remove a tag from a contact
   */
  removeTagFromContact: async (contactId: string, tagId: string): Promise<void> => {
    const api = createAuthenticatedRequest();
    await api.delete(`/api/contacts/${contactId}/tags/${tagId}`);
  },

  /**
   * Perform bulk tag operations on multiple contacts
   */
  bulkTagOperation: async (request: BulkTagOperationRequest): Promise<BulkTagOperationResponse> => {
    const api = createAuthenticatedRequest();
    const response = await api.post('/api/contacts/tags/bulk', request);
    return response.data;
  },
};