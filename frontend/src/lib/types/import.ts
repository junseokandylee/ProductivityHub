export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type ImportErrorSeverity = 'warning' | 'error' | 'critical';

export type ImportErrorType = 
  | 'required_field'
  | 'invalid_format'
  | 'invalid_phone'
  | 'invalid_email'
  | 'invalid_kakao_id'
  | 'duplicate_row'
  | 'value_too_long'
  | 'unknown_column'
  | 'database_error';

export interface ImportJobResponse {
  jobId: string;
  status: ImportJobStatus;
  totalRows: number;
  createdAt: string;
}

export interface ImportJobProgress {
  jobId: string;
  status: ImportJobStatus;
  progress: number;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  processingRate?: number;
  estimatedSecondsRemaining?: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ImportError {
  rowNumber: number;
  column?: string;
  errorType: ImportErrorType;
  errorMessage: string;
  rawValue?: string;
  suggestedFix?: string;
  severity: ImportErrorSeverity;
}

export interface ImportErrorsResponse {
  jobId: string;
  totalErrors: number;
  errors: ImportError[];
  hasMoreErrors: boolean;
  errorFileUrl?: string;
}

export interface ImportPreviewResponse {
  detectedColumns: string[];
  sampleRows: Record<string, string | null>[];
  estimatedRows: number;
  suggestedMappings: Record<string, string>;
  validationWarnings: string[];
}

export interface ImportProgressEvent {
  eventType: 'status' | 'progress' | 'error' | 'complete';
  jobStatus: ImportJobProgress;
  timestamp: string;
}