import axios from 'axios';
import { 
  DeduplicationPreviewRequest,
  DeduplicationPreviewResponse,
  MergeContactsRequest,
  MergeContactsResponse 
} from '@/lib/types/deduplication';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5284';

// Create axios instance with auth token
const createAuthenticatedRequest = () => {
  const token = localStorage.getItem('authToken');
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });
};

export const deduplicationAPI = {
  /**
   * Preview duplicate contact clusters
   */
  previewDuplicates: async (request: DeduplicationPreviewRequest): Promise<DeduplicationPreviewResponse> => {
    const api = createAuthenticatedRequest();
    const response = await api.post('/api/contacts/dedup/preview', request);
    return response.data;
  },

  /**
   * Execute contact merges for duplicate clusters
   */
  mergeContacts: async (request: MergeContactsRequest): Promise<MergeContactsResponse> => {
    const api = createAuthenticatedRequest();
    const response = await api.post('/api/contacts/dedup/merge', request);
    return response.data;
  },
};