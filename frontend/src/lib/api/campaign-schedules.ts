import { 
  CampaignScheduleResponse, 
  CreateCampaignScheduleRequest,
  UpdateCampaignScheduleRequest,
  UpcomingExecutionItem 
} from '@/lib/types/campaign-schedule';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7001/api';

class CampaignSchedulesAPI {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async getAllSchedules(): Promise<CampaignScheduleResponse[]> {
    const response = await fetch(`${API_BASE_URL}/campaign-schedules`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schedules: ${response.statusText}`);
    }

    return response.json();
  }

  async getScheduleById(id: string): Promise<CampaignScheduleResponse> {
    const response = await fetch(`${API_BASE_URL}/campaign-schedules/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.statusText}`);
    }

    return response.json();
  }

  async getSchedulesByCampaign(campaignId: string): Promise<CampaignScheduleResponse[]> {
    const response = await fetch(`${API_BASE_URL}/campaign-schedules/campaign/${campaignId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch campaign schedules: ${response.statusText}`);
    }

    return response.json();
  }

  async getUpcomingExecutions(days: number = 7): Promise<UpcomingExecutionItem[]> {
    const response = await fetch(`${API_BASE_URL}/campaign-schedules/upcoming?days=${days}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch upcoming executions: ${response.statusText}`);
    }

    return response.json();
  }

  async createSchedule(request: CreateCampaignScheduleRequest): Promise<CampaignScheduleResponse> {
    const response = await fetch(`${API_BASE_URL}/campaign-schedules`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create schedule: ${errorText}`);
    }

    return response.json();
  }

  async updateSchedule(id: string, request: UpdateCampaignScheduleRequest): Promise<CampaignScheduleResponse> {
    const response = await fetch(`${API_BASE_URL}/campaign-schedules/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update schedule: ${errorText}`);
    }

    return response.json();
  }

  async toggleScheduleStatus(id: string, isActive: boolean): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/campaign-schedules/${id}/toggle`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to toggle schedule status: ${errorText}`);
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/campaign-schedules/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete schedule: ${errorText}`);
    }
  }

  async executeScheduleNow(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/campaign-schedules/${id}/execute`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to execute schedule: ${errorText}`);
    }
  }

  async getExecutionHistory(scheduleId: string, page: number = 1, pageSize: number = 10) {
    const response = await fetch(
      `${API_BASE_URL}/campaign-schedules/${scheduleId}/executions?page=${page}&pageSize=${pageSize}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch execution history: ${response.statusText}`);
    }

    return response.json();
  }
}

// Create and export singleton instance
export const campaignSchedulesAPI = new CampaignSchedulesAPI();

// Export individual methods for easier importing
export const {
  getAllSchedules,
  getScheduleById,
  getSchedulesByCampaign,
  getUpcomingExecutions,
  createSchedule,
  updateSchedule,
  toggleScheduleStatus,
  deleteSchedule,
  executeScheduleNow,
  getExecutionHistory,
} = campaignSchedulesAPI;