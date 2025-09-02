import { apiClient, ApiResponse } from './client';

// Types for segment rules
export type SegmentRuleType = 'group' | 'condition';

export interface SegmentRule {
  type: SegmentRuleType;
}

export interface SegmentRuleGroup extends SegmentRule {
  type: 'group';
  operator: 'and' | 'or';
  children: SegmentRule[];
}

export interface SegmentRuleCondition extends SegmentRule {
  type: 'condition';
  field: string;
  operator: string;
  value?: any;
}

// Request/Response types
export interface CreateSegmentRequest {
  name: string;
  description?: string;
  rules: SegmentRule;
}

export interface UpdateSegmentRequest {
  name: string;
  description?: string;
  rules: SegmentRule;
  isActive: boolean;
}

export interface EvaluateSegmentRequest {
  rules: SegmentRule;
  sampleSize?: number;
}

export interface EvaluateSegmentResponse {
  totalCount: number;
  sampleContacts: ContactSummary[];
  executionTimeMs: number;
}

export interface ContactSummary {
  id: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentDto {
  id: string;
  name: string;
  description?: string;
  rules: SegmentRule;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
}

export interface CloneSegmentRequest {
  name: string;
  description?: string;
}

export interface ValidateRulesRequest {
  rules: SegmentRule;
}

export interface SegmentValidationResult {
  isValid: boolean;
  errors: string[];
  depth: number;
  conditionCount: number;
}

export interface SegmentUsageAuditDto {
  id: string;
  action: string;
  context?: string;
  resultCount?: number;
  executionTimeMs?: number;
  occurredAt: string;
  userName: string;
}

// API functions
export const segmentsApi = {
  // Get all segments
  async getSegments(includeInactive = false): Promise<ApiResponse<SegmentDto[]>> {
    const params = new URLSearchParams();
    if (includeInactive) {
      params.append('includeInactive', 'true');
    }
    
    return apiClient.get(`/segments?${params.toString()}`);
  },

  // Get a specific segment
  async getSegment(id: string): Promise<ApiResponse<SegmentDto>> {
    return apiClient.get(`/segments/${id}`);
  },

  // Create a new segment
  async createSegment(request: CreateSegmentRequest): Promise<ApiResponse<SegmentDto>> {
    return apiClient.post('/segments', request);
  },

  // Update an existing segment
  async updateSegment(id: string, request: UpdateSegmentRequest): Promise<ApiResponse<SegmentDto>> {
    return apiClient.put(`/segments/${id}`, request);
  },

  // Delete a segment (soft delete)
  async deleteSegment(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/segments/${id}`);
  },

  // Clone an existing segment
  async cloneSegment(id: string, request: CloneSegmentRequest): Promise<ApiResponse<SegmentDto>> {
    return apiClient.post(`/segments/${id}/clone`, request);
  },

  // Evaluate segment rules
  async evaluateSegment(request: EvaluateSegmentRequest): Promise<ApiResponse<EvaluateSegmentResponse>> {
    return apiClient.post('/segments/evaluate', request);
  },

  // Validate segment rules
  async validateRules(request: ValidateRulesRequest): Promise<ApiResponse<SegmentValidationResult>> {
    return apiClient.post('/segments/validate', request);
  },

  // Get contact IDs matching a segment
  async getSegmentContactIds(id: string, limit?: number): Promise<ApiResponse<string[]>> {
    const params = new URLSearchParams();
    if (limit) {
      params.append('limit', limit.toString());
    }
    
    return apiClient.post(`/segments/${id}/contacts?${params.toString()}`, {});
  },

  // Get segment usage history
  async getSegmentUsage(id: string, limit = 50): Promise<ApiResponse<SegmentUsageAuditDto[]>> {
    return apiClient.get(`/segments/${id}/usage?limit=${limit}`);
  },
};

// Helper functions
export const segmentRuleHelpers = {
  // Create a new empty group rule
  createGroup(operator: 'and' | 'or' = 'and'): SegmentRuleGroup {
    return {
      type: 'group',
      operator,
      children: [],
    };
  },

  // Create a new condition rule
  createCondition(field = '', operator = 'equals', value?: any): SegmentRuleCondition {
    return {
      type: 'condition',
      field,
      operator,
      value,
    };
  },

  // Validate rule structure
  isValidRule(rule: SegmentRule): boolean {
    if (rule.type === 'group') {
      const group = rule as SegmentRuleGroup;
      return group.children.length > 0 && group.children.every(child => this.isValidRule(child));
    } else if (rule.type === 'condition') {
      const condition = rule as SegmentRuleCondition;
      return !!condition.field && !!condition.operator;
    }
    return false;
  },

  // Count total conditions in rule tree
  countConditions(rule: SegmentRule): number {
    if (rule.type === 'group') {
      const group = rule as SegmentRuleGroup;
      return group.children.reduce((count, child) => count + this.countConditions(child), 0);
    } else if (rule.type === 'condition') {
      return 1;
    }
    return 0;
  },

  // Calculate rule tree depth
  calculateDepth(rule: SegmentRule): number {
    if (rule.type === 'group') {
      const group = rule as SegmentRuleGroup;
      if (group.children.length === 0) return 1;
      return 1 + Math.max(...group.children.map(child => this.calculateDepth(child)));
    } else if (rule.type === 'condition') {
      return 1;
    }
    return 0;
  },

  // Convert rule tree to human-readable description
  describeRule(rule: SegmentRule): string {
    if (rule.type === 'group') {
      const group = rule as SegmentRuleGroup;
      if (group.children.length === 0) return 'Empty group';
      const childDescriptions = group.children.map(child => this.describeRule(child));
      return `(${childDescriptions.join(` ${group.operator.toUpperCase()} `)})`;
    } else if (rule.type === 'condition') {
      const condition = rule as SegmentRuleCondition;
      return `${condition.field} ${condition.operator} ${condition.value ?? ''}`;
    }
    return 'Unknown rule';
  },
};

// Field and operator definitions
export const segmentFieldsAndOperators = {
  // Available fields for segment conditions
  fields: {
    full_name: { label: 'Full Name', type: 'string' },
    notes: { label: 'Notes', type: 'string' },
    is_active: { label: 'Is Active', type: 'boolean' },
    created_at: { label: 'Created Date', type: 'date' },
    updated_at: { label: 'Updated Date', type: 'date' },
    last_activity_date: { label: 'Last Activity', type: 'date' },
    tag: { label: 'Tag', type: 'tag' },
  },

  // Available operators by field type
  operators: {
    string: [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'contains', label: 'Contains' },
      { value: 'not_contains', label: 'Does Not Contain' },
      { value: 'starts_with', label: 'Starts With' },
      { value: 'ends_with', label: 'Ends With' },
      { value: 'is_empty', label: 'Is Empty' },
      { value: 'is_not_empty', label: 'Is Not Empty' },
    ],
    number: [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'greater_than', label: 'Greater Than' },
      { value: 'less_than', label: 'Less Than' },
      { value: 'between', label: 'Between' },
    ],
    date: [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'greater_than', label: 'After' },
      { value: 'less_than', label: 'Before' },
      { value: 'between', label: 'Between' },
      { value: 'days_ago', label: 'Days Ago' },
      { value: 'in_last_days', label: 'In Last Days' },
    ],
    boolean: [
      { value: 'equals', label: 'Is' },
      { value: 'not_equals', label: 'Is Not' },
    ],
    tag: [
      { value: 'has_tag', label: 'Has Tag' },
      { value: 'not_has_tag', label: 'Does Not Have Tag' },
      { value: 'has_any_tags', label: 'Has Any Of These Tags' },
      { value: 'has_all_tags', label: 'Has All Of These Tags' },
    ],
  },

  // Get operators for a specific field
  getOperatorsForField(fieldName: string) {
    const field = this.fields[fieldName as keyof typeof this.fields];
    if (!field) return [];
    return this.operators[field.type as keyof typeof this.operators] || [];
  },

  // Check if operator requires a value
  operatorRequiresValue(operator: string): boolean {
    return !['is_empty', 'is_not_empty'].includes(operator);
  },

  // Check if operator requires multiple values (array)
  operatorRequiresMultipleValues(operator: string): boolean {
    return ['between', 'has_any_tags', 'has_all_tags'].includes(operator);
  },
};