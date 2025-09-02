import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5284';

// Types
export interface Conversation {
  id: string;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  contactKakaoId?: string;
  channel: 'sms' | 'kakao' | 'email' | 'push';
  status: 'unread' | 'read' | 'replied' | 'closed' | 'assigned';
  assignedToUserId?: string;
  assignedToUserName?: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  contentType: 'text' | 'image' | 'file' | 'template';
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'kakao' | 'email' | 'push';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  senderName?: string;
  senderUserId?: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

export interface ConversationListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  channel?: string[];
  status?: string[];
  assignedToUserId?: string;
  unreadOnly?: boolean;
  sortBy?: 'lastMessageAt' | 'createdAt' | 'contactName';
  sortOrder?: 'asc' | 'desc';
}

export interface ConversationListResponse {
  conversations: Conversation[];
  totalCount: number;
  unreadCount: number;
  hasNextPage: boolean;
  page: number;
  pageSize: number;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  contentType?: 'text' | 'template';
  attachments?: File[];
  metadata?: Record<string, any>;
}

export interface SendMessageResponse {
  messageId: string;
  status: 'pending' | 'sent' | 'failed';
  message: string;
  sentAt: string;
}

export interface AutoReplyRule {
  id: string;
  name: string;
  enabled: boolean;
  channels: ('sms' | 'kakao' | 'email' | 'push')[];
  conditions: {
    keywords?: string[];
    timeRange?: {
      startHour: number;
      endHour: number;
      days: number[]; // 0=Sunday, 1=Monday, etc.
    };
    firstMessageOnly?: boolean;
  };
  response: {
    content: string;
    delay?: number; // seconds
  };
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutoReplyConfig {
  enabled: boolean;
  rules: AutoReplyRule[];
  fallbackMessage?: string;
  maxRepliesPerConversation?: number;
}

class InboxAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getConversations(params: ConversationListParams = {}): Promise<ConversationListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.channel?.length) searchParams.set('channel', params.channel.join(','));
    if (params.status?.length) searchParams.set('status', params.status.join(','));
    if (params.assignedToUserId) searchParams.set('assignedToUserId', params.assignedToUserId);
    if (params.unreadOnly) searchParams.set('unreadOnly', 'true');
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const url = `${API_BASE_URL}/api/inbox/conversations${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await axios.get(url, {
      headers: this.getAuthHeaders()
    });

    return response.data;
  }

  async getConversation(id: string): Promise<Conversation> {
    const response = await axios.get(
      `${API_BASE_URL}/api/inbox/conversations/${id}`,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async getMessages(conversationId: string, page = 1, pageSize = 50): Promise<{ messages: Message[]; hasNextPage: boolean; totalCount: number }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/inbox/conversations/${conversationId}/messages`,
      {
        params: { page, pageSize },
        headers: this.getAuthHeaders()
      }
    );

    return response.data;
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const formData = new FormData();
    formData.append('content', request.content);
    formData.append('contentType', request.contentType || 'text');
    
    if (request.metadata) {
      formData.append('metadata', JSON.stringify(request.metadata));
    }

    if (request.attachments) {
      request.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    const response = await axios.post(
      `${API_BASE_URL}/api/inbox/conversations/${request.conversationId}/messages`,
      formData,
      {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return response.data;
  }

  async markAsRead(conversationId: string): Promise<void> {
    await axios.put(
      `${API_BASE_URL}/api/inbox/conversations/${conversationId}/read`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  async updateConversationStatus(conversationId: string, status: Conversation['status']): Promise<void> {
    await axios.put(
      `${API_BASE_URL}/api/inbox/conversations/${conversationId}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    );
  }

  async assignConversation(conversationId: string, userId?: string): Promise<void> {
    await axios.put(
      `${API_BASE_URL}/api/inbox/conversations/${conversationId}/assign`,
      { userId },
      { headers: this.getAuthHeaders() }
    );
  }

  async getAutoReplyConfig(): Promise<AutoReplyConfig> {
    const response = await axios.get(
      `${API_BASE_URL}/api/inbox/auto-reply`,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async updateAutoReplyConfig(config: Partial<AutoReplyConfig>): Promise<AutoReplyConfig> {
    const response = await axios.put(
      `${API_BASE_URL}/api/inbox/auto-reply`,
      config,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async createAutoReplyRule(rule: Omit<AutoReplyRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AutoReplyRule> {
    const response = await axios.post(
      `${API_BASE_URL}/api/inbox/auto-reply/rules`,
      rule,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async updateAutoReplyRule(id: string, rule: Partial<AutoReplyRule>): Promise<AutoReplyRule> {
    const response = await axios.put(
      `${API_BASE_URL}/api/inbox/auto-reply/rules/${id}`,
      rule,
      { headers: this.getAuthHeaders() }
    );

    return response.data;
  }

  async deleteAutoReplyRule(id: string): Promise<void> {
    await axios.delete(
      `${API_BASE_URL}/api/inbox/auto-reply/rules/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }
}

export const inboxAPI = new InboxAPI();