export interface DuplicateContact {
  contactId: string;
  fullName: string;
  phone?: string;
  email?: string;
  kakaoId?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  completenessScore: number;
  recencyScore: number;
  fieldCount: number;
}

export interface DuplicateCluster {
  clusterId: string;
  confidenceScore: number;
  contacts: DuplicateContact[];
  suggestedSurvivor: DuplicateContact;
  matchingCriteria: string[];
  conflictCount: number;
}

export interface DeduplicationPreviewRequest {
  minConfidenceScore?: number;
  maxClusters?: number;
  onlyWithConflicts?: boolean;
  contactIds?: string[];
}

export interface DeduplicationPreviewResponse {
  clusters: DuplicateCluster[];
  totalContacts: number;
  totalClusters: number;
  clustersWithConflicts: number;
  estimatedSpaceSavings: number;
}

export interface MergeRules {
  strategy: 'MostComplete' | 'MostRecent' | 'Oldest' | 'Manual';
  preferVerified: boolean;
  preferRecent: boolean;
  fieldRules: Record<string, 'KeepSurvivor' | 'KeepRecent' | 'KeepLongest' | 'Combine' | 'Manual'>;
  preserveAllTags: boolean;
  combineNotes: boolean;
}

export interface MergeContactsRequest {
  clusterIds: string[];
  mergeRules: MergeRules;
  dryRun?: boolean;
  manualSurvivors?: Record<string, string>;
  manualFieldResolutions?: Record<string, string>;
}

export interface MergeOperationResult {
  clusterId: string;
  survivorContactId: string;
  mergedContactIds: string[];
  mergedFields: Record<string, string>;
  tagsMerged: number;
  historyRecordsUpdated: number;
  success: boolean;
  errorMessage?: string;
}

export interface MergeContactsResponse {
  success: boolean;
  clustersProcessed: number;
  contactsMerged: number;
  survivorContacts: number;
  mergeResults: MergeOperationResult[];
  errors: string[];
  warnings: string[];
}

export interface DeduplicationStats {
  totalContacts: number;
  duplicateClusters: number;
  contactsInClusters: number;
  potentialSpaceSavings: number;
  averageConfidenceScore: number;
  matchingCriteriaBreakdown: Record<string, number>;
  analyzedAt: string;
}