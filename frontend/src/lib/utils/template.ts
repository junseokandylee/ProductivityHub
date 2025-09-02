// Token detection and replacement utilities for message templates

export const TOKEN_REGEX = /\{([a-zA-Z0-9_]+)\}/g;

export interface TokenInfo {
  token: string;
  name: string;
  start: number;
  end: number;
}

export interface TemplateVariables {
  [key: string]: string;
}

/**
 * Detects all tokens in a template string
 */
export function detectTokens(template: string): string[] {
  const tokens = new Set<string>();
  const matches = template.matchAll(TOKEN_REGEX);
  
  for (const match of matches) {
    if (match[1]) {
      tokens.add(match[1].toLowerCase());
    }
  }
  
  return Array.from(tokens);
}

/**
 * Renders a template by replacing tokens with variable values
 */
export function renderTemplate(
  template: string, 
  variables: TemplateVariables, 
  missingTokenPlaceholder = '[missing]'
): string {
  return template.replace(TOKEN_REGEX, (match, tokenName) => {
    const key = tokenName.toLowerCase();
    return variables[key] ?? `${missingTokenPlaceholder}:${tokenName}`;
  });
}

/**
 * Gets missing tokens from a template
 */
export function getMissingTokens(template: string, variables: TemplateVariables): string[] {
  const allTokens = detectTokens(template);
  return allTokens.filter(token => !(token in variables));
}

/**
 * Inserts a token at a specific cursor position in a textarea
 */
export function insertTokenAtCursor(
  textarea: HTMLTextAreaElement,
  token: string,
  cursorPosition?: number
): { newText: string; newCursorPosition: number } {
  const text = textarea.value;
  const position = cursorPosition ?? textarea.selectionStart ?? text.length;
  
  const tokenText = `{${token}}`;
  const newText = text.slice(0, position) + tokenText + text.slice(position);
  const newCursorPosition = position + tokenText.length;
  
  return { newText, newCursorPosition };
}

/**
 * Common personalization tokens for political campaigns
 */
export const COMMON_TOKENS = [
  { name: 'name', label: '이름', description: '연락처 이름' },
  { name: 'phone', label: '전화번호', description: '연락처 전화번호' },
  { name: 'email', label: '이메일', description: '연락처 이메일' },
  { name: 'district', label: '선거구', description: '유권자 선거구' },
  { name: 'candidate', label: '후보자명', description: '후보자 이름' },
  { name: 'party', label: '정당명', description: '후보자 소속 정당' },
  { name: 'age', label: '나이', description: '유권자 나이' },
  { name: 'gender', label: '성별', description: '유권자 성별' },
] as const;

/**
 * Character count limits by channel type
 */
export const CHARACTER_LIMITS = {
  SMS: 90, // Single SMS part in Korean
  KAKAO: 1000, // KakaoTalk message limit
  EMAIL: 10000, // Email body limit
} as const;

/**
 * Gets character limit for a specific channel
 */
export function getCharacterLimit(channel?: string): number {
  if (!channel) return CHARACTER_LIMITS.SMS; // Default to SMS
  return CHARACTER_LIMITS[channel as keyof typeof CHARACTER_LIMITS] ?? CHARACTER_LIMITS.SMS;
}

/**
 * Calculates SMS parts based on Korean character encoding
 */
export function calculateSMSParts(text: string): number {
  // Korean characters typically use 2 bytes in SMS encoding
  // Single SMS: 70 characters (140 bytes) for Korean
  // Multi-part SMS: 67 characters per part
  const koreanChars = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []).length;
  const otherChars = text.length - koreanChars;
  const totalBytes = (koreanChars * 2) + otherChars;
  
  if (totalBytes <= 140) return 1;
  return Math.ceil(totalBytes / 134); // 134 bytes per multi-part SMS
}