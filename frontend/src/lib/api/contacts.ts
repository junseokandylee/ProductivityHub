import axios from 'axios';
import { ContactSearchParams, ContactSearchResponse, Contact, Tag, CreateContactRequest, UpdateContactRequest, ContactHistory, ContactHistorySearchRequest } from '@/lib/types/contact';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5284';

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  count: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactSegment {
  id: string;
  name: string;
  description?: string;
  count: number;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateAudienceRequest {
  groupIds: string[];
  segmentIds: string[];
  filterJson?: Record<string, any>;
}

export interface EstimateAudienceResponse {
  totalContacts: number;
  uniqueContacts: number;
  breakdownBySource: Record<string, number>;
}

export interface SampleContactRequest {
  groupIds: string[];
  segmentIds: string[];
  filterJson?: Record<string, any>;
}

export interface SampleContactResponse {
  name: string;
  phone?: string;
  email?: string;
  personalizationData: Record<string, string>;
}

export interface PreviewTemplateRequest {
  messageBody: string;
  title?: string;
  variables: Record<string, string>;
}

export interface PreviewTemplateResponse {
  renderedBody: string;
  renderedTitle?: string;
  missingVariables: string[];
  characterCount: number;
}

export interface ChannelStatusResponse {
  channel: string;
  isEnabled: boolean;
  quotaRemaining: number;
  dailyLimit: number;
  hasWarning: boolean;
  warningMessage?: string;
}

export interface QuotaDetail {
  used: number;
  limit: number;
  usagePercentage: number;
  isNearLimit: boolean;
}

export interface QuotaCurrentResponse {
  channelQuotas: Record<string, QuotaDetail>;
  totalUsedToday: number;
  totalDailyLimit: number;
}

class ContactsAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getContactGroups(search?: string, page = 1, pageSize = 50): Promise<ContactGroup[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    const response = await axios.get(
      `${API_BASE_URL}/api/contacts/groups?${params}`,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async getContactSegments(search?: string, page = 1, pageSize = 50): Promise<ContactSegment[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    const response = await axios.get(
      `${API_BASE_URL}/api/contacts/segments?${params}`,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async estimateAudience(request: EstimateAudienceRequest): Promise<EstimateAudienceResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/contacts/estimate`,
      request,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async getSampleContact(request: SampleContactRequest): Promise<SampleContactResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/contacts/sample`,
      request,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async previewTemplate(request: PreviewTemplateRequest): Promise<PreviewTemplateResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/templates/preview`,
      request,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async getChannelStatus(): Promise<ChannelStatusResponse[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/channels/status`,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async getCurrentQuota(): Promise<QuotaCurrentResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/api/quotas/current`,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  // New Contact Management API methods
  async searchContacts(params: ContactSearchParams): Promise<ContactSearchResponse> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params.tagIds && params.tagIds.length > 0) {
      params.tagIds.forEach(tagId => queryParams.append('tagIds', tagId));
    }
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.afterUpdatedAt) queryParams.append('afterUpdatedAt', params.afterUpdatedAt);
    if (params.afterId) queryParams.append('afterId', params.afterId);

    const response = await axios.get(
      `${API_BASE_URL}/api/contacts?${queryParams}`,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async getContact(id: string): Promise<Contact> {
    const response = await axios.get(
      `${API_BASE_URL}/api/contacts/${id}`,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async createContact(data: CreateContactRequest): Promise<Contact> {
    const response = await axios.post(
      `${API_BASE_URL}/api/contacts`,
      data,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async updateContact(id: string, data: UpdateContactRequest): Promise<Contact> {
    const response = await axios.put(
      `${API_BASE_URL}/api/contacts/${id}`,
      data,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async deleteContact(id: string): Promise<void> {
    await axios.delete(
      `${API_BASE_URL}/api/contacts/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  async getTags(): Promise<Tag[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/tags`,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async getContactHistory(id: string, params?: Partial<ContactHistorySearchRequest>): Promise<ContactHistory[]> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await axios.get(
      `${API_BASE_URL}/api/contacts/${id}/history?${queryParams}`,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }
}

export const contactsAPI = new ContactsAPI();