// Campaign Wizard Types and Interfaces

export interface AudienceSelection {
  groupIds: string[];
  segmentIds: string[];
  filterJson: Record<string, any>;
  includeAll: boolean;
  estimatedCount?: number;
}

export interface MessageComposition {
  name: string;
  messageTitle?: string;
  messageBody: string;
  variables: Record<string, string>;
}

export interface ChannelSettings {
  channels: Array<{
    channel: string;
    isEnabled: boolean;
  }>;
  channelOrder: string[];
  fallbackEnabled: boolean;
}

export interface ReviewData {
  estimatedCost: number;
  recipientCount: number;
  quotaOk: boolean;
  scheduledAt?: Date;
}

export interface CampaignWizardState {
  currentStep: number;
  audience: AudienceSelection;
  message: MessageComposition;
  channels: ChannelSettings;
  review: ReviewData;
  isSubmitting: boolean;
  errors: Record<string, string[]>;
}

export type WizardStep = 1 | 2 | 3 | 4;

export interface StepValidation {
  isValid: boolean;
  errors: string[];
}

// Action types for the wizard reducer
export type WizardAction =
  | { type: 'SET_STEP'; payload: WizardStep }
  | { type: 'SET_AUDIENCE'; payload: Partial<AudienceSelection> }
  | { type: 'SET_MESSAGE'; payload: Partial<MessageComposition> }
  | { type: 'SET_CHANNELS'; payload: Partial<ChannelSettings> }
  | { type: 'SET_REVIEW'; payload: Partial<ReviewData> }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_ERRORS'; payload: { step: WizardStep; errors: string[] } }
  | { type: 'CLEAR_ERRORS'; payload: WizardStep }
  | { type: 'RESET_WIZARD' }
  | { type: 'HYDRATE_STATE'; payload: Partial<CampaignWizardState> };

// Step configuration
export interface StepConfig {
  step: WizardStep;
  title: string;
  description: string;
  isOptional?: boolean;
}

export const WIZARD_STEPS: StepConfig[] = [
  {
    step: 1,
    title: 'Audience Selection',
    description: 'Select who will receive your campaign'
  },
  {
    step: 2,
    title: 'Message Composition',
    description: 'Create your campaign message'
  },
  {
    step: 3,
    title: 'Channel Settings',
    description: 'Configure delivery channels and priority'
  },
  {
    step: 4,
    title: 'Review & Send',
    description: 'Review your campaign and send'
  }
];

// Initial state
export const initialWizardState: CampaignWizardState = {
  currentStep: 1,
  audience: {
    groupIds: [],
    segmentIds: [],
    filterJson: {},
    includeAll: false
  },
  message: {
    name: '',
    messageTitle: '',
    messageBody: '',
    variables: {}
  },
  channels: {
    channels: [
      { channel: 'SMS', isEnabled: true },
      { channel: 'KAKAO', isEnabled: true },
      { channel: 'EMAIL', isEnabled: false }
    ],
    channelOrder: ['SMS', 'KAKAO'],
    fallbackEnabled: true
  },
  review: {
    estimatedCost: 0,
    recipientCount: 0,
    quotaOk: true
  },
  isSubmitting: false,
  errors: {}
};