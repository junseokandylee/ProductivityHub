import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsAPI, type EstimateAudienceRequest, type SampleContactRequest, type PreviewTemplateRequest } from '@/lib/api/contacts';
import { ContactSearchParams, CreateContactRequest, UpdateContactRequest } from '@/lib/types/contact';

// Query keys
const QUERY_KEYS = {
  contactGroups: (search?: string, page?: number) => ['contacts', 'groups', { search, page }] as const,
  contactSegments: (search?: string, page?: number) => ['contacts', 'segments', { search, page }] as const,
  estimateAudience: (request: EstimateAudienceRequest) => ['contacts', 'estimate', request] as const,
  sampleContact: (request: SampleContactRequest) => ['contacts', 'sample', request] as const,
  previewTemplate: (request: PreviewTemplateRequest) => ['templates', 'preview', request] as const,
  channelStatus: () => ['channels', 'status'] as const,
  currentQuota: () => ['quotas', 'current'] as const,
  contacts: (params: ContactSearchParams) => ['contacts', params] as const,
  contact: (id: string) => ['contact', id] as const,
  contactHistory: (id: string) => ['contact-history', id] as const,
  tags: () => ['tags'] as const,
};

// Hooks for contact groups
export function useContactGroups(search?: string, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: QUERY_KEYS.contactGroups(search, page),
    queryFn: () => contactsAPI.getContactGroups(search, page, pageSize),
    enabled: true,
  });
}

// Hooks for contact segments
export function useContactSegments(search?: string, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: QUERY_KEYS.contactSegments(search, page),
    queryFn: () => contactsAPI.getContactSegments(search, page, pageSize),
    enabled: true,
  });
}

// Hook for audience estimation
export function useEstimateAudience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: EstimateAudienceRequest) => contactsAPI.estimateAudience(request),
    onSuccess: (data, variables) => {
      // Cache the result for this specific request
      queryClient.setQueryData(
        QUERY_KEYS.estimateAudience(variables),
        data
      );
    },
  });
}

// Hook to get cached audience estimate
export function useCachedAudienceEstimate(request: EstimateAudienceRequest | null) {
  return useQuery({
    queryKey: request ? QUERY_KEYS.estimateAudience(request) : ['contacts', 'estimate', 'empty'],
    queryFn: () => contactsAPI.estimateAudience(request!),
    enabled: false, // Only manually triggered
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for sample contact retrieval
export function useSampleContact(request: SampleContactRequest | null, enabled = true) {
  return useQuery({
    queryKey: request ? QUERY_KEYS.sampleContact(request) : ['contacts', 'sample', 'empty'],
    queryFn: () => contactsAPI.getSampleContact(request!),
    enabled: enabled && request !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for template preview
export function usePreviewTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: PreviewTemplateRequest) => contactsAPI.previewTemplate(request),
    onSuccess: (data, variables) => {
      // Cache the result for this specific request
      queryClient.setQueryData(
        QUERY_KEYS.previewTemplate(variables),
        data
      );
    },
  });
}

// Hook for channel status
export function useChannelStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.channelStatus(),
    queryFn: () => contactsAPI.getChannelStatus(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Hook for current quota
export function useCurrentQuota() {
  return useQuery({
    queryKey: QUERY_KEYS.currentQuota(),
    queryFn: () => contactsAPI.getCurrentQuota(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Contact CRUD Hooks

// Hook for searching contacts
export function useContacts(params: ContactSearchParams) {
  return useQuery({
    queryKey: QUERY_KEYS.contacts(params),
    queryFn: () => contactsAPI.searchContacts(params),
    keepPreviousData: true,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook for getting a single contact
export function useContact(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.contact(id),
    queryFn: () => contactsAPI.getContact(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for getting contact history
export function useContactHistory(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.contactHistory(id),
    queryFn: () => contactsAPI.getContactHistory(id),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook for getting tags
export function useTags() {
  return useQuery({
    queryKey: QUERY_KEYS.tags(),
    queryFn: () => contactsAPI.getTags(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for creating a contact
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContactRequest) => contactsAPI.createContact(data),
    onSuccess: () => {
      // Invalidate contacts queries to refetch data
      queryClient.invalidateQueries(['contacts']);
      queryClient.invalidateQueries(['tags']);
    },
  });
}

// Hook for updating a contact
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactRequest }) => 
      contactsAPI.updateContact(id, data),
    onSuccess: (data, variables) => {
      // Update the contact in the cache
      queryClient.setQueryData(QUERY_KEYS.contact(variables.id), data);
      // Invalidate related queries
      queryClient.invalidateQueries(['contacts']);
      queryClient.invalidateQueries(QUERY_KEYS.contactHistory(variables.id));
      queryClient.invalidateQueries(['tags']);
    },
  });
}

// Hook for deleting a contact
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactsAPI.deleteContact(id),
    onSuccess: (_, id) => {
      // Remove contact from cache
      queryClient.removeQueries(QUERY_KEYS.contact(id));
      queryClient.removeQueries(QUERY_KEYS.contactHistory(id));
      // Invalidate contacts list
      queryClient.invalidateQueries(['contacts']);
      queryClient.invalidateQueries(['tags']);
    },
  });
}