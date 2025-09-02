import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5284';

// Request interfaces
export interface CampaignChannelRequest {
  channel: string;
  orderIndex: number;
  fallbackEnabled: boolean;
}

export interface CampaignAudienceRequest {
  groupIds?: string[];
  segmentIds?: string[];
  filterJson?: Record<string, any>;
  includeAll: boolean;
}

export interface CreateCampaignRequest {
  name: string;
  messageTitle?: string;
  messageBody: string;
  variables?: Record<string, string>;
  channels: CampaignChannelRequest[];
  audience: CampaignAudienceRequest;
  scheduledAt?: string;
}

export interface EstimateCampaignRequest {
  audience: CampaignAudienceRequest;
  channels: CampaignChannelRequest[];
}

// Response interfaces
export interface CreateCampaignResponse {
  campaignId: string;
  status: string;
  message: string;
  createdAt: string;
}

export interface EstimateCampaignResponse {
  recipientCount: number;
  estimatedCost: number;
  quotaRequired: number;
  quotaOk: boolean;
  currency: string;
  channelBreakdown?: Record<string, number>;
}

export interface CampaignListItem {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: string;
  scheduledAt?: string;
  completedAt?: string;
  recipientCount?: number;
  successCount?: number;
  failureCount?: number;
  channels: string[];
  tags?: string[];
}

export interface CampaignListResponse {
  campaigns: CampaignListItem[];
  totalCount: number;
  hasNextPage: boolean;
  page: number;
  pageSize: number;
}

export interface CampaignListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string[];
  channels?: string[];
  sortBy?: 'createdAt' | 'scheduledAt' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
}

class CampaignsAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async estimateCampaign(request: EstimateCampaignRequest): Promise<EstimateCampaignResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/campaigns/estimate`,
      request,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async createCampaign(request: CreateCampaignRequest): Promise<CreateCampaignResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/campaigns`,
      request,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async getCampaigns(params: CampaignListParams = {}): Promise<CampaignListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.status?.length) searchParams.set('status', params.status.join(','));
    if (params.channels?.length) searchParams.set('channels', params.channels.join(','));
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const url = `${API_BASE_URL}/api/campaigns${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await axios.get(url, {
      headers: this.getAuthHeaders()
    });

    return response.data;
  }

  async getCampaign(id: string): Promise<CampaignListItem> {
    const response = await axios.get(
      `${API_BASE_URL}/api/campaigns/${id}`,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }
}

export const campaignsAPI = new CampaignsAPI();