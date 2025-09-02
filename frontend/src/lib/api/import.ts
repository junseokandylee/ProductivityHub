import axios from 'axios';
import { 
  ImportJobResponse, 
  ImportJobStatus, 
  ImportJobProgress,
  ImportErrorsResponse, 
  ImportPreviewResponse 
} from '@/lib/types/import';

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

export const importAPI = {
  /**
   * Start contact import from uploaded file
   */
  startImport: async (file: File): Promise<ImportJobResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const api = createAuthenticatedRequest();
    const response = await api.post('/api/imports/contacts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  /**
   * Get import job status and progress
   */
  getJobStatus: async (jobId: string): Promise<ImportJobProgress> => {
    const api = createAuthenticatedRequest();
    const response = await api.get(`/api/imports/${jobId}`);
    return response.data;
  },

  /**
   * Get import validation errors
   */
  getJobErrors: async (jobId: string, limit = 100): Promise<ImportErrorsResponse> => {
    const api = createAuthenticatedRequest();
    const response = await api.get(`/api/imports/${jobId}/errors`, {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Preview import file without processing
   */
  previewFile: async (file: File): Promise<ImportPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const api = createAuthenticatedRequest();
    const response = await api.post('/api/imports/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  /**
   * Download error report file
   */
  downloadErrorReport: async (jobId: string): Promise<Blob> => {
    const api = createAuthenticatedRequest();
    const response = await api.get(`/api/imports/${jobId}/error-file`, {
      responseType: 'blob',
    });
    return response.data;
  },
};