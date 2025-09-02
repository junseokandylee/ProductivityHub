'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inboxAPI, type ConversationListParams, type SendMessageRequest, type AutoReplyConfig } from '@/lib/api/inbox';

// Query keys
const QUERY_KEYS = {
  conversations: (params: ConversationListParams) => ['conversations', params] as const,
  conversation: (id: string) => ['conversation', id] as const,
  messages: (conversationId: string, page: number) => ['messages', conversationId, page] as const,
  autoReply: () => ['auto-reply'] as const,
} as const;

// Hook for conversations list
export function useConversations(params: ConversationListParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.conversations(params),
    queryFn: () => inboxAPI.getConversations(params),
    keepPreviousData: true,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 5 * 1000, // Refetch every 5 seconds for real-time updates
  });
}

// Hook for single conversation
export function useConversation(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.conversation(id),
    queryFn: () => inboxAPI.getConversation(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for conversation messages
export function useMessages(conversationId: string, page = 1) {
  return useQuery({
    queryKey: QUERY_KEYS.messages(conversationId, page),
    queryFn: () => inboxAPI.getMessages(conversationId, page),
    enabled: !!conversationId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 3 * 1000, // Poll every 3 seconds for new messages
    keepPreviousData: true,
  });
}

// Hook for sending messages
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SendMessageRequest) => inboxAPI.sendMessage(request),
    onMutate: async (request) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.messages(request.conversationId, 1) });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(QUERY_KEYS.messages(request.conversationId, 1));

      // Optimistically update the messages
      queryClient.setQueryData(QUERY_KEYS.messages(request.conversationId, 1), (old: any) => {
        if (!old) return old;

        const optimisticMessage = {
          id: `temp-${Date.now()}`,
          conversationId: request.conversationId,
          content: request.content,
          contentType: request.contentType || 'text',
          direction: 'outbound' as const,
          channel: 'sms' as const, // Will be determined by backend
          status: 'pending' as const,
          senderName: 'You',
          attachments: [],
          metadata: request.metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return {
          ...old,
          messages: [optimisticMessage, ...old.messages],
          totalCount: old.totalCount + 1,
        };
      });

      return { previousMessages };
    },
    onError: (err, request, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          QUERY_KEYS.messages(request.conversationId, 1),
          context.previousMessages
        );
      }
    },
    onSuccess: (data, request) => {
      // Invalidate and refetch messages to get the real message from server
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages(request.conversationId, 1) });
      // Also invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Hook for marking conversation as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => inboxAPI.markAsRead(conversationId),
    onSuccess: (_, conversationId) => {
      // Update conversation in cache
      queryClient.setQueryData(QUERY_KEYS.conversation(conversationId), (old: any) => {
        if (!old) return old;
        return { ...old, status: 'read', unreadCount: 0 };
      });
      // Invalidate conversations list to update unread counts
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Hook for updating conversation status
export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, status }: { conversationId: string; status: string }) => 
      inboxAPI.updateConversationStatus(conversationId, status as any),
    onSuccess: (_, { conversationId, status }) => {
      // Update conversation in cache
      queryClient.setQueryData(QUERY_KEYS.conversation(conversationId), (old: any) => {
        if (!old) return old;
        return { ...old, status };
      });
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Hook for assigning conversation
export function useAssignConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId?: string }) => 
      inboxAPI.assignConversation(conversationId, userId),
    onSuccess: (_, { conversationId }) => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(conversationId) });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Hook for auto-reply configuration
export function useAutoReplyConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.autoReply(),
    queryFn: () => inboxAPI.getAutoReplyConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for updating auto-reply configuration
export function useUpdateAutoReplyConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Partial<AutoReplyConfig>) => inboxAPI.updateAutoReplyConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autoReply() });
    },
  });
}

// Hook for creating auto-reply rule
export function useCreateAutoReplyRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inboxAPI.createAutoReplyRule.bind(inboxAPI),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autoReply() });
    },
  });
}

// Hook for updating auto-reply rule
export function useUpdateAutoReplyRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rule }: { id: string; rule: any }) => inboxAPI.updateAutoReplyRule(id, rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autoReply() });
    },
  });
}

// Hook for deleting auto-reply rule
export function useDeleteAutoReplyRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inboxAPI.deleteAutoReplyRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autoReply() });
    },
  });
}