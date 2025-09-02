import { ApiResponse } from './types';

export interface ActivityScoreDistribution {
  highActivity: number; // Score >= 70
  mediumActivity: number; // Score 30-70
  lowActivity: number; // Score < 30
  averageScore: number;
  medianScore: number;
  scoreHistogram: Record<number, number>;
}

export interface ContactWithScore {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  kakaoId?: string;
  notes: string;
  isActive: boolean;
  activityScore: number;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: Array<{
    id: string;
    name: string;
    color: string;
    description: string;
    contactCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export const activityScoreAPI = {
  async getScoreDistribution(): Promise<ApiResponse<ActivityScoreDistribution>> {
    const response = await fetch('/api/activity-score/distribution', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    
    return response.json();
  },

  async getContactsByScoreRange(
    minScore: number = 0, 
    maxScore: number = 100, 
    limit: number = 100
  ): Promise<ApiResponse<ContactWithScore[]>> {
    const params = new URLSearchParams({
      minScore: minScore.toString(),
      maxScore: maxScore.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(`/api/activity-score/contacts?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    
    return response.json();
  },

  async getContactsByActivityLevel(
    level: 'high' | 'medium' | 'low',
    limit: number = 100
  ): Promise<ApiResponse<ContactWithScore[]>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    const response = await fetch(`/api/activity-score/contacts/${level}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    
    return response.json();
  },

  async recalculateContactScore(contactId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`/api/activity-score/contacts/${contactId}/recalculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    
    return response.json();
  },

  async recalculateAllScores(): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch('/api/activity-score/recalculate-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    
    return response.json();
  },
};