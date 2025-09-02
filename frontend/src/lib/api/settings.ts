'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5284'

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Organization Types
export interface Organization {
  id: string
  name: string
  displayName: string
  description?: string
  website?: string
  phone?: string
  email: string
  address?: string
  logoUrl?: string
  createdAt: string
  updatedAt: string
  settings: {
    timezone: string
    language: string
    dateFormat: string
    currency: string
  }
}

export interface UpdateOrganizationRequest {
  name?: string
  displayName?: string
  description?: string
  website?: string
  phone?: string
  email?: string
  address?: string
  logoUrl?: string
  settings?: {
    timezone?: string
    language?: string
    dateFormat?: string
    currency?: string
  }
}

// Channel Configuration Types
export interface ChannelConfig {
  channel: 'sms' | 'kakao' | 'email' | 'push'
  isEnabled: boolean
  provider?: string
  apiKey?: string
  apiSecret?: string
  senderId?: string
  templateId?: string
  webhookUrl?: string
  status: 'active' | 'inactive' | 'pending' | 'error'
  lastTested?: string
  testResult?: {
    success: boolean
    message: string
    testedAt: string
  }
  dailyLimit?: number
  monthlyLimit?: number
  costPerMessage?: number
}

export interface UpdateChannelConfigRequest {
  channel: 'sms' | 'kakao' | 'email' | 'push'
  isEnabled?: boolean
  provider?: string
  apiKey?: string
  apiSecret?: string
  senderId?: string
  templateId?: string
  webhookUrl?: string
  dailyLimit?: number
  monthlyLimit?: number
  costPerMessage?: number
}

export interface TestChannelRequest {
  channel: 'sms' | 'kakao' | 'email' | 'push'
  recipient: string
  message?: string
}

// User Management Types
export interface User {
  id: string
  email: string
  name: string
  role: 'Owner' | 'Admin' | 'Staff'
  status: 'active' | 'invited' | 'suspended'
  avatar?: string
  lastLogin?: string
  createdAt: string
  invitedBy?: string
  permissions: string[]
}

export interface InviteUserRequest {
  email: string
  name: string
  role: 'Admin' | 'Staff'
  message?: string
}

export interface UpdateUserRequest {
  userId: string
  name?: string
  role?: 'Admin' | 'Staff'
  status?: 'active' | 'suspended'
}

// Quota Types
export interface QuotaInfo {
  monthlyLimit: number
  currentUsage: number
  remainingQuota: number
  usagePercentage: number
  resetDate: string
  plan: 'starter' | 'professional' | 'enterprise' | 'custom'
  channelLimits: Array<{
    channel: string
    limit: number
    usage: number
    cost: number
  }>
  alertSettings: {
    enabled: boolean
    thresholds: number[]
    recipients: string[]
  }
  billingInfo: {
    nextBillingDate: string
    lastPayment?: {
      amount: number
      date: string
      method: string
    }
  }
}

export interface UpdateQuotaAlertsRequest {
  enabled: boolean
  thresholds: number[]
  recipients: string[]
}

// Security Types
export interface SecuritySettings {
  passwordPolicy: {
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
    maxAge: number
  }
  twoFactorAuth: {
    enabled: boolean
    method: 'totp' | 'sms' | 'email'
    enforcedForRoles: string[]
  }
  sessionSettings: {
    maxDuration: number
    idleTimeout: number
    maxConcurrentSessions: number
  }
  ipWhitelist: string[]
}

export interface ApiToken {
  id: string
  name: string
  token: string
  permissions: string[]
  lastUsed?: string
  expiresAt?: string
  createdAt: string
  createdBy: string
  status: 'active' | 'revoked'
}

export interface CreateApiTokenRequest {
  name: string
  permissions: string[]
  expiresAt?: string
}

export interface UpdateSecuritySettingsRequest {
  passwordPolicy?: Partial<SecuritySettings['passwordPolicy']>
  twoFactorAuth?: Partial<SecuritySettings['twoFactorAuth']>
  sessionSettings?: Partial<SecuritySettings['sessionSettings']>
  ipWhitelist?: string[]
}

// API Functions
async function fetchOrganization(): Promise<Organization> {
  const { data } = await apiClient.get<Organization>('/settings/organization')
  return data
}

async function updateOrganization(request: UpdateOrganizationRequest): Promise<Organization> {
  const { data } = await apiClient.put<Organization>('/settings/organization', request)
  return data
}

async function fetchChannelConfigs(): Promise<ChannelConfig[]> {
  const { data } = await apiClient.get<ChannelConfig[]>('/settings/channels')
  return data
}

async function updateChannelConfig(request: UpdateChannelConfigRequest): Promise<ChannelConfig> {
  const { data } = await apiClient.put<ChannelConfig>(`/settings/channels/${request.channel}`, request)
  return data
}

async function testChannel(request: TestChannelRequest): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(`/settings/channels/${request.channel}/test`, request)
  return data
}

async function fetchUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>('/settings/users')
  return data
}

async function inviteUser(request: InviteUserRequest): Promise<User> {
  const { data } = await apiClient.post<User>('/settings/users/invite', request)
  return data
}

async function updateUser(request: UpdateUserRequest): Promise<User> {
  const { data } = await apiClient.put<User>(`/settings/users/${request.userId}`, request)
  return data
}

async function deleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/settings/users/${userId}`)
}

async function fetchQuotaInfo(): Promise<QuotaInfo> {
  const { data } = await apiClient.get<QuotaInfo>('/settings/quota')
  return data
}

async function updateQuotaAlerts(request: UpdateQuotaAlertsRequest): Promise<QuotaInfo> {
  const { data } = await apiClient.put<QuotaInfo>('/settings/quota/alerts', request)
  return data
}

async function fetchSecuritySettings(): Promise<SecuritySettings> {
  const { data } = await apiClient.get<SecuritySettings>('/settings/security')
  return data
}

async function updateSecuritySettings(request: UpdateSecuritySettingsRequest): Promise<SecuritySettings> {
  const { data } = await apiClient.put<SecuritySettings>('/settings/security', request)
  return data
}

async function fetchApiTokens(): Promise<ApiToken[]> {
  const { data } = await apiClient.get<ApiToken[]>('/settings/security/tokens')
  return data
}

async function createApiToken(request: CreateApiTokenRequest): Promise<ApiToken> {
  const { data } = await apiClient.post<ApiToken>('/settings/security/tokens', request)
  return data
}

async function revokeApiToken(tokenId: string): Promise<void> {
  await apiClient.delete(`/settings/security/tokens/${tokenId}`)
}

// React Query Hooks
export function useOrganization() {
  return useQuery({
    queryKey: ['settings', 'organization'],
    queryFn: fetchOrganization,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateOrganization,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings', 'organization'], data)
    },
    onError: (error) => {
      console.error('Failed to update organization:', error)
    }
  })
}

export function useChannelConfigs() {
  return useQuery({
    queryKey: ['settings', 'channels'],
    queryFn: fetchChannelConfigs,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2
  })
}

export function useUpdateChannelConfig() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateChannelConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings', 'channels'], (old: ChannelConfig[] = []) => 
        old.map(config => config.channel === data.channel ? data : config)
      )
    }
  })
}

export function useTestChannel() {
  return useMutation({
    mutationFn: testChannel
  })
}

export function useUsers() {
  return useQuery({
    queryKey: ['settings', 'users'],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: inviteUser,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings', 'users'], (old: User[] = []) => [...old, data])
    }
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings', 'users'], (old: User[] = []) =>
        old.map(user => user.id === data.id ? data : user)
      )
    }
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: (_, userId) => {
      queryClient.setQueryData(['settings', 'users'], (old: User[] = []) =>
        old.filter(user => user.id !== userId)
      )
    }
  })
}

export function useQuotaInfo() {
  return useQuery({
    queryKey: ['settings', 'quota'],
    queryFn: fetchQuotaInfo,
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 2, // 2 minutes
    retry: 2
  })
}

export function useUpdateQuotaAlerts() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateQuotaAlerts,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings', 'quota'], data)
    }
  })
}

export function useSecuritySettings() {
  return useQuery({
    queryKey: ['settings', 'security'],
    queryFn: fetchSecuritySettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2
  })
}

export function useUpdateSecuritySettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateSecuritySettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings', 'security'], data)
    }
  })
}

export function useApiTokens() {
  return useQuery({
    queryKey: ['settings', 'security', 'tokens'],
    queryFn: fetchApiTokens,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2
  })
}

export function useCreateApiToken() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createApiToken,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings', 'security', 'tokens'], (old: ApiToken[] = []) => [...old, data])
    }
  })
}

export function useRevokeApiToken() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: revokeApiToken,
    onSuccess: (_, tokenId) => {
      queryClient.setQueryData(['settings', 'security', 'tokens'], (old: ApiToken[] = []) =>
        old.map(token => token.id === tokenId ? { ...token, status: 'revoked' as const } : token)
      )
    }
  })
}