'use client';

import { AxiosError } from 'axios';

// Problem Details standard from ASP.NET Core
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  extensions?: Record<string, any>;
}

// User-friendly error message mapping
export interface UserFriendlyError {
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  actionable: boolean;
  retryable: boolean;
}

// Error code mappings for common API errors
const ERROR_MAPPINGS: Record<string, UserFriendlyError> = {
  // Validation errors
  'VALIDATION_ERROR': {
    title: '입력 값 오류',
    message: '입력한 정보를 다시 확인해주세요.',
    severity: 'error',
    actionable: true,
    retryable: true,
  },
  'REQUIRED_FIELD_MISSING': {
    title: '필수 항목 누락',
    message: '모든 필수 항목을 입력해주세요.',
    severity: 'error',
    actionable: true,
    retryable: true,
  },
  
  // Quota and limits
  'QUOTA_EXCEEDED': {
    title: '할당량 초과',
    message: '일일 메시지 할당량을 초과했습니다. 내일 다시 시도해주세요.',
    severity: 'error',
    actionable: false,
    retryable: false,
  },
  'QUOTA_INSUFFICIENT': {
    title: '할당량 부족',
    message: '남은 할당량이 부족합니다. 수신자 수를 줄이거나 내일 다시 시도해주세요.',
    severity: 'warning',
    actionable: true,
    retryable: false,
  },
  
  // Channel errors
  'CHANNEL_UNAVAILABLE': {
    title: '채널 사용 불가',
    message: '선택한 채널이 현재 사용할 수 없습니다. 다른 채널을 선택해주세요.',
    severity: 'error',
    actionable: true,
    retryable: true,
  },
  'CHANNEL_CONFIGURATION_ERROR': {
    title: '채널 설정 오류',
    message: '채널 설정에 문제가 있습니다. 관리자에게 문의해주세요.',
    severity: 'error',
    actionable: false,
    retryable: false,
  },
  
  // Campaign errors
  'CAMPAIGN_CREATION_FAILED': {
    title: '캠페인 생성 실패',
    message: '캠페인을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.',
    severity: 'error',
    actionable: false,
    retryable: true,
  },
  'CAMPAIGN_SEND_FAILED': {
    title: '캠페인 발송 실패',
    message: '캠페인 발송 중 오류가 발생했습니다. 상태를 확인하고 필요시 다시 시도해주세요.',
    severity: 'error',
    actionable: false,
    retryable: true,
  },
  
  // Network and server errors
  'NETWORK_ERROR': {
    title: '네트워크 오류',
    message: '인터넷 연결을 확인하고 다시 시도해주세요.',
    severity: 'error',
    actionable: false,
    retryable: true,
  },
  'SERVER_ERROR': {
    title: '서버 오류',
    message: '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    severity: 'error',
    actionable: false,
    retryable: true,
  },
  'TIMEOUT_ERROR': {
    title: '요청 시간 초과',
    message: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
    severity: 'warning',
    actionable: false,
    retryable: true,
  },
};

// Default error for unhandled cases
const DEFAULT_ERROR: UserFriendlyError = {
  title: '오류 발생',
  message: '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  severity: 'error',
  actionable: false,
  retryable: true,
};

/**
 * Map API error to user-friendly message
 */
export function mapApiError(error: unknown): UserFriendlyError {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    const response = error.response;
    const data = response?.data;
    
    // Handle ProblemDetails response
    if (data && typeof data === 'object' && 'title' in data) {
      const problemDetails = data as ProblemDetails;
      
      // Try to find specific error mapping
      const errorType = problemDetails.type || problemDetails.title || '';
      const mapping = ERROR_MAPPINGS[errorType];
      
      if (mapping) {
        return {
          ...mapping,
          message: problemDetails.detail || mapping.message,
        };
      }
    }
    
    // Handle HTTP status codes
    const status = response?.status;
    switch (status) {
      case 400:
        return ERROR_MAPPINGS['VALIDATION_ERROR'];
      case 401:
        return {
          title: '인증 오류',
          message: '로그인이 필요합니다.',
          severity: 'error',
          actionable: true,
          retryable: false,
        };
      case 403:
        return {
          title: '권한 오류',
          message: '이 작업을 수행할 권한이 없습니다.',
          severity: 'error',
          actionable: false,
          retryable: false,
        };
      case 404:
        return {
          title: '리소스 없음',
          message: '요청한 정보를 찾을 수 없습니다.',
          severity: 'error',
          actionable: false,
          retryable: false,
        };
      case 429:
        return {
          title: '요청 한도 초과',
          message: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.',
          severity: 'warning',
          actionable: false,
          retryable: true,
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return ERROR_MAPPINGS['SERVER_ERROR'];
      default:
        if (error.code === 'ECONNABORTED') {
          return ERROR_MAPPINGS['TIMEOUT_ERROR'];
        }
        if (error.code === 'ERR_NETWORK') {
          return ERROR_MAPPINGS['NETWORK_ERROR'];
        }
    }
  }
  
  // Handle network errors
  if (error instanceof Error) {
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return ERROR_MAPPINGS['NETWORK_ERROR'];
    }
  }
  
  return DEFAULT_ERROR;
}

/**
 * Create retry delay with exponential backoff
 */
export function getRetryDelay(attemptIndex: number, baseDelay = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attemptIndex), 10000);
}

/**
 * Check if error is retryable based on status code and error type
 */
export function isRetryableError(error: unknown): boolean {
  const mappedError = mapApiError(error);
  return mappedError.retryable;
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: UserFriendlyError): string {
  return `${error.title}: ${error.message}`;
}

/**
 * Extract validation errors from ProblemDetails extensions
 */
export function extractValidationErrors(error: unknown): Record<string, string[]> | null {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'extensions' in data) {
      const problemDetails = data as ProblemDetails;
      const errors = problemDetails.extensions?.errors;
      if (errors && typeof errors === 'object') {
        return errors as Record<string, string[]>;
      }
    }
  }
  return null;
}