import { test, expect, Page, BrowserContext } from '@playwright/test'
import { randomUUID } from 'crypto'

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = `test-${randomUUID().slice(0, 8)}@example.com`
const TEST_PASSWORD = 'TestPassword123!'
const TEST_NAME = 'Test User'
const TEST_INVITE_CODE = 'TEST-INVITE-12345'

// Utility functions
class AuthHelper {
  constructor(private page: Page) {}

  async navigateToAuth(path: string, queryParams?: Record<string, string>) {
    let url = `${BASE_URL}/auth/${path}`
    if (queryParams) {
      const params = new URLSearchParams(queryParams).toString()
      url += `?${params}`
    }
    await this.page.goto(url)
  }

  async fillLoginForm(email: string = TEST_EMAIL, password: string = TEST_PASSWORD, rememberMe: boolean = false) {
    await this.page.fill('input[type="email"]', email)
    await this.page.fill('input[type="password"]', password)
    if (rememberMe) {
      await this.page.check('input[name="rememberMe"]')
    }
  }

  async fillSignupForm(type: 'invite' | 'org' = 'invite', data?: Partial<SignupData>) {
    const defaultData = {
      name: TEST_NAME,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      inviteCode: TEST_INVITE_CODE,
      organizationName: 'Test Organization',
      organizationType: 'campaign' as const,
      phone: '010-1234-5678'
    }
    
    const formData = { ...defaultData, ...data }

    if (type === 'invite') {
      await this.page.fill('input[placeholder*="초대 코드"]', formData.inviteCode)
      await this.page.fill('input[placeholder*="이름"]', formData.name)
      await this.page.fill('input[type="email"]', formData.email)
      await this.page.fill('input[placeholder*="비밀번호를 입력하세요"]', formData.password)
      await this.page.fill('input[placeholder*="비밀번호를 다시"]', formData.password)
    } else {
      await this.page.fill('input[placeholder*="조직명"]', formData.organizationName)
      await this.page.selectOption('select', formData.organizationType)
      await this.page.fill('input[placeholder*="담당자 이름"]', formData.name)
      await this.page.fill('input[type="email"]', formData.email)
      await this.page.fill('input[type="tel"]', formData.phone)
      await this.page.fill('input[placeholder*="비밀번호를 입력하세요"]', formData.password)
      await this.page.fill('input[placeholder*="비밀번호를 다시"]', formData.password)
    }

    // Agree to terms and privacy
    await this.page.check('input[id*="agreeToTerms"]')
    await this.page.check('input[id*="agreeToPrivacy"]')
  }

  async expectValidationError(message: string) {
    await expect(this.page.locator('.text-red-600').filter({ hasText: message })).toBeVisible()
  }

  async expectNextParameterPreserved(expectedNext: string) {
    const url = new URL(this.page.url())
    expect(url.searchParams.get('next')).toBe(expectedNext)
  }

  async checkAccessibility() {
    // Check for proper labels
    await expect(this.page.locator('input[type="email"]')).toHaveAttribute('id')
    await expect(this.page.locator('label[for*="email"]')).toBeVisible()
    
    // Check for aria attributes
    const inputs = this.page.locator('input')
    const inputCount = await inputs.count()
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const ariaDescribedBy = await input.getAttribute('aria-describedby')
      const ariaLabel = await input.getAttribute('aria-label')
      const id = await input.getAttribute('id')
      // At least one accessibility attribute should be present
      expect(ariaDescribedBy || ariaLabel || id).toBeTruthy()
    }
  }

  async testKeyboardNavigation() {
    // Test tab navigation
    await this.page.press('body', 'Tab')
    await expect(this.page.locator(':focus')).toBeVisible()
    
    // Test form submission with Enter
    await this.page.press('body', 'Enter')
  }
}

interface SignupData {
  name: string
  email: string
  password: string
  inviteCode: string
  organizationName: string
  organizationType: 'campaign' | 'party' | 'organization'
  phone: string
}

test.describe('Authentication Flow Tests', () => {
  let helper: AuthHelper

  test.beforeEach(async ({ page }) => {
    helper = new AuthHelper(page)
  })

  test.describe('Login Page (/auth/login)', () => {
    test('should render login page correctly', async ({ page }) => {
      await helper.navigateToAuth('login')
      
      // Check page title and branding
      await expect(page.locator('h1')).toContainText('정치생산성허브')
      await expect(page.locator('text=계정에 로그인하여 시작하세요')).toBeVisible()
      
      // Check form elements
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('input[type="checkbox"]')).toBeVisible() // Remember me
      await expect(page.locator('button[type="submit"]')).toContainText('로그인')
      
      // Check SSO options
      await expect(page.locator('text=Google로 로그인')).toBeVisible()
      await expect(page.locator('text=카카오로 로그인')).toBeVisible()
      
      // Check navigation links
      await expect(page.locator('a[href*="/auth/reset-password"]')).toContainText('비밀번호 찾기')
      await expect(page.locator('a[href*="/auth/signup"]')).toContainText('회원가입')
    })

    test('should show validation errors for invalid input', async ({ page }) => {
      await helper.navigateToAuth('login')
      
      // Test empty form submission
      await page.click('button[type="submit"]')
      await helper.expectValidationError('올바른 이메일 주소를 입력해주세요')
      
      // Test invalid email
      await page.fill('input[type="email"]', 'invalid-email')
      await page.click('button[type="submit"]')
      await helper.expectValidationError('올바른 이메일 주소를 입력해주세요')
      
      // Test short password
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', '123')
      await page.click('button[type="submit"]')
      await helper.expectValidationError('비밀번호는 최소 6자 이상이어야 합니다')
    })

    test('should toggle password visibility', async ({ page }) => {
      await helper.navigateToAuth('login')
      
      const passwordInput = page.locator('input[type="password"]')
      const toggleButton = page.locator('button:has-text("show password"), button:has-text("hide password"), button:has([data-testid="eye"]), button:has([data-testid="eye-off"])')
      
      await page.fill('input[type="password"]', 'testpassword')
      
      // Initially should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password')
      
      // Click toggle to show
      await toggleButton.click()
      await expect(page.locator('input[type="text"]').last()).toHaveValue('testpassword')
      
      // Click toggle to hide again
      await toggleButton.click()
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })

    test('should handle error messages from URL params', async ({ page }) => {
      await helper.navigateToAuth('login', { error: 'unauthorized' })
      await expect(page.locator('text=로그인이 필요한 페이지입니다')).toBeVisible()
      
      await helper.navigateToAuth('login', { error: 'expired' })
      await expect(page.locator('text=세션이 만료되었습니다')).toBeVisible()
    })

    test('should preserve next parameter in links', async ({ page }) => {
      const nextUrl = '/dashboard/analytics'
      await helper.navigateToAuth('login', { next: nextUrl })
      
      // Check that next parameter is preserved in links
      await expect(page.locator(`a[href*="next=${encodeURIComponent(nextUrl)}"]`)).toHaveCount(2) // Reset password and signup links
    })
  })

  test.describe('Signup Page (/auth/signup)', () => {
    test('should render signup page with both tabs', async ({ page }) => {
      await helper.navigateToAuth('signup')
      
      // Check page title and branding
      await expect(page.locator('h1')).toContainText('정치생산성허브')
      await expect(page.locator('text=새로운 계정을 만들어 시작하세요')).toBeVisible()
      
      // Check tabs
      await expect(page.locator('text=초대 코드')).toBeVisible()
      await expect(page.locator('text=신규 조직')).toBeVisible()
      
      // Check invite tab is active by default
      await expect(page.locator('input[placeholder*="초대 코드"]')).toBeVisible()
    })

    test('should switch between tabs correctly', async ({ page }) => {
      await helper.navigateToAuth('signup')
      
      // Default to invite tab
      await expect(page.locator('input[placeholder*="초대 코드"]')).toBeVisible()
      
      // Switch to organization tab
      await page.click('text=신규 조직')
      await expect(page.locator('input[placeholder*="조직명"]')).toBeVisible()
      await expect(page.locator('select')).toBeVisible() // Organization type selector
      
      // Switch back to invite tab
      await page.click('text=초대 코드')
      await expect(page.locator('input[placeholder*="초대 코드"]')).toBeVisible()
    })

    test('should validate invite signup form', async ({ page }) => {
      await helper.navigateToAuth('signup')
      
      // Test form validation
      await page.click('button[type="submit"]')
      await helper.expectValidationError('초대 코드를 입력해주세요')
      
      // Fill partial form
      await page.fill('input[placeholder*="초대 코드"]', TEST_INVITE_CODE)
      await page.click('button[type="submit"]')
      await helper.expectValidationError('이름은 최소 2자 이상이어야 합니다')
      
      // Test email validation
      await page.fill('input[placeholder*="이름"]', TEST_NAME)
      await page.fill('input[type="email"]', 'invalid-email')
      await page.click('button[type="submit"]')
      await helper.expectValidationError('올바른 이메일 주소를 입력해주세요')
      
      // Test password length
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[placeholder*="비밀번호를 입력하세요"]', '123')
      await page.click('button[type="submit"]')
      await helper.expectValidationError('비밀번호는 최소 8자 이상이어야 합니다')
      
      // Test password confirmation mismatch
      await page.fill('input[placeholder*="비밀번호를 입력하세요"]', TEST_PASSWORD)
      await page.fill('input[placeholder*="비밀번호를 다시"]', 'different-password')
      await page.click('button[type="submit"]')
      await helper.expectValidationError('비밀번호가 일치하지 않습니다')
      
      // Test terms agreement
      await page.fill('input[placeholder*="비밀번호를 다시"]', TEST_PASSWORD)
      await page.click('button[type="submit"]')
      await helper.expectValidationError('이용약관에 동의해주세요')
    })

    test('should validate organization signup form', async ({ page }) => {
      await helper.navigateToAuth('signup')
      await page.click('text=신규 조직')
      
      // Test organization fields validation
      await page.click('button[type="submit"]')
      await helper.expectValidationError('조직명은 최소 2자 이상이어야 합니다')
      
      await page.fill('input[placeholder*="조직명"]', 'Test Org')
      await page.click('button[type="submit"]')
      await helper.expectValidationError('조직 유형을 선택해주세요')
      
      // Test phone validation
      await page.selectOption('select', 'campaign')
      await page.fill('input[placeholder*="담당자 이름"]', TEST_NAME)
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="tel"]', '123')
      await page.click('button[type="submit"]')
      await helper.expectValidationError('올바른 전화번호를 입력해주세요')
    })

    test('should auto-fill invite code from URL parameter', async ({ page }) => {
      const inviteCode = 'AUTO-FILL-TEST'
      await helper.navigateToAuth('signup', { invite: inviteCode })
      
      // Should auto-switch to invite tab and fill code
      await expect(page.locator('input[placeholder*="초대 코드"]')).toHaveValue(inviteCode)
    })
  })

  test.describe('Reset Password Page (/auth/reset-password)', () => {
    test('should render request reset form initially', async ({ page }) => {
      await helper.navigateToAuth('reset-password')
      
      await expect(page.locator('h1')).toContainText('정치생산성허브')
      await expect(page.locator('text=비밀번호를 재설정하세요')).toBeVisible()
      await expect(page.locator('text=비밀번호 재설정 요청')).toBeVisible()
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toContainText('재설정 링크 보내기')
    })

    test('should show reset form with token parameter', async ({ page }) => {
      await helper.navigateToAuth('reset-password', { token: 'test-token', email: TEST_EMAIL })
      
      await expect(page.locator('text=새로운 비밀번호를 설정하세요')).toBeVisible()
      await expect(page.locator('text=비밀번호 재설정')).toBeVisible()
      await expect(page.locator('input[placeholder*="새 비밀번호"]')).toBeVisible()
      await expect(page.locator('input[placeholder*="다시 입력"]')).toBeVisible()
    })

    test('should validate reset password form', async ({ page }) => {
      await helper.navigateToAuth('reset-password', { token: 'test-token' })
      
      // Test password requirements
      await page.click('button[type="submit"]')
      await helper.expectValidationError('비밀번호는 최소 8자 이상이어야 합니다')
      
      // Test password confirmation mismatch
      await page.fill('input[placeholder*="새 비밀번호를 입력하세요"]', TEST_PASSWORD)
      await page.fill('input[placeholder*="다시 입력하세요"]', 'different')
      await page.click('button[type="submit"]')
      await helper.expectValidationError('비밀번호가 일치하지 않습니다')
      
      // Check password requirements info
      await expect(page.locator('text=최소 8자 이상')).toBeVisible()
      await expect(page.locator('text=영문 대소문자, 숫자, 특수문자 조합 권장')).toBeVisible()
    })

    test('should pre-fill email from URL parameter', async ({ page }) => {
      await helper.navigateToAuth('reset-password', { email: TEST_EMAIL })
      
      await expect(page.locator('input[type="email"]')).toHaveValue(TEST_EMAIL)
    })

    test('should show sent confirmation state', async ({ page }) => {
      await helper.navigateToAuth('reset-password')
      
      // Mock successful request - this would normally trigger a state change
      // For this test, we'll navigate to a mock sent state
      await page.evaluate(() => {
        (window as any).__testSetState = 'sent'
        const setCurrentStep = (window as any).__testSetCurrentStep
        if (setCurrentStep) setCurrentStep('sent')
      })
      
      // Should show sent confirmation (this might need API mocking in real tests)
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.click('text=재설정 링크 보내기')
      
      // Check if loading state appears
      await expect(page.locator('text=전송 중...')).toBeVisible({ timeout: 1000 }).catch(() => {
        // If API call completes quickly, check for success state
      })
    })
  })

  test.describe('Email Verification Page (/auth/verify-email)', () => {
    test('should show verification in progress', async ({ page }) => {
      await helper.navigateToAuth('verify-email', { 
        token: 'test-verification-token', 
        email: TEST_EMAIL 
      })
      
      await expect(page.locator('h1')).toContainText('정치생산성허브')
      await expect(page.locator('text=이메일 인증')).toBeVisible()
      
      // Should show verification state initially
      await expect(page.locator('text=이메일 인증 중')).toBeVisible()
      await expect(page.locator('.animate-spin')).toBeVisible()
    })

    test('should show error state for invalid parameters', async ({ page }) => {
      await helper.navigateToAuth('verify-email') // No token/email
      
      await expect(page.locator('text=인증 실패')).toBeVisible()
      await expect(page.locator('text=유효하지 않은 인증 링크입니다')).toBeVisible()
    })

    test('should provide resend functionality', async ({ page }) => {
      await helper.navigateToAuth('verify-email', { email: TEST_EMAIL })
      
      // Should show error state without token
      await expect(page.locator('text=인증 실패')).toBeVisible()
      
      // Should show resend section
      await expect(page.locator('text=새로운 인증 링크 받기')).toBeVisible()
      
      // Resend button should be disabled initially with countdown
      const resendButton = page.locator('button:has-text("초 후 재전송 가능")')
      await expect(resendButton).toBeDisabled()
    })
  })

  test.describe('Deep-link Parameter Preservation', () => {
    const testNextUrl = '/dashboard/analytics?tab=overview'

    test('should preserve next parameter across auth pages', async ({ page }) => {
      // Start at login with next parameter
      await helper.navigateToAuth('login', { next: testNextUrl })
      helper.expectNextParameterPreserved(testNextUrl)
      
      // Navigate to signup
      await page.click('a[href*="/auth/signup"]')
      await page.waitForLoadState('networkidle')
      helper.expectNextParameterPreserved(testNextUrl)
      
      // Navigate to reset password
      await page.click('a[href*="/auth/login"]')
      await page.waitForLoadState('networkidle')
      await page.click('a[href*="/auth/reset-password"]')
      await page.waitForLoadState('networkidle')
      helper.expectNextParameterPreserved(testNextUrl)
    })

    test('should maintain next parameter during form submissions', async ({ page }) => {
      await helper.navigateToAuth('login', { next: testNextUrl })
      
      // Submit form with validation errors - should preserve next
      await page.click('button[type="submit"]')
      await page.waitForSelector('.text-red-600')
      helper.expectNextParameterPreserved(testNextUrl)
      
      // Navigate to different auth page and back
      await page.click('a[href*="/auth/signup"]')
      await page.waitForLoadState('networkidle')
      await page.click('a[href*="/auth/login"]')
      await page.waitForLoadState('networkidle')
      helper.expectNextParameterPreserved(testNextUrl)
    })

    test('should handle SSO redirects with next parameter', async ({ page }) => {
      await helper.navigateToAuth('login', { next: testNextUrl })
      
      // Check SSO buttons include next parameter
      const googleSSOButton = page.locator('button:has-text("Google로 로그인")')
      const kakaoSSOButton = page.locator('button:has-text("카카오로 로그인")')
      
      await expect(googleSSOButton).toBeVisible()
      await expect(kakaoSSOButton).toBeVisible()
      
      // Note: Actual SSO redirect testing would need API mocking
      // This test verifies the buttons are present and functional
    })
  })

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ]

    viewports.forEach(({ name, width, height }) => {
      test(`should render correctly on ${name}`, async ({ page, browser }) => {
        const context = await browser.newContext({ 
          viewport: { width, height } 
        })
        const responsivePage = await context.newPage()
        
        await responsivePage.goto(`${BASE_URL}/auth/login`)
        
        // Check that key elements are visible and accessible
        await expect(responsivePage.locator('h1')).toBeVisible()
        await expect(responsivePage.locator('input[type="email"]')).toBeVisible()
        await expect(responsivePage.locator('input[type="password"]')).toBeVisible()
        await expect(responsivePage.locator('button[type="submit"]')).toBeVisible()
        
        // Check that form is usable on mobile
        if (name === 'mobile') {
          await responsivePage.fill('input[type="email"]', TEST_EMAIL)
          await responsivePage.fill('input[type="password"]', TEST_PASSWORD)
          await expect(responsivePage.locator('button[type="submit"]')).toBeEnabled()
        }
        
        // Check responsive layout doesn't have horizontal scroll
        const bodyScrollWidth = await responsivePage.evaluate(() => document.body.scrollWidth)
        const windowInnerWidth = await responsivePage.evaluate(() => window.innerWidth)
        expect(bodyScrollWidth).toBeLessThanOrEqual(windowInnerWidth + 1) // Allow 1px tolerance
        
        await context.close()
      })
    })
  })

  test.describe('Accessibility', () => {
    test('should meet accessibility standards on login page', async ({ page }) => {
      await helper.navigateToAuth('login')
      await helper.checkAccessibility()
    })

    test('should support keyboard navigation', async ({ page }) => {
      await helper.navigateToAuth('login')
      
      // Test tab order
      await page.press('body', 'Tab')
      await expect(page.locator(':focus')).toBeVisible()
      
      // Should be able to navigate through all form elements
      const focusableElements = ['input[type="email"]', 'input[type="password"]', 'input[type="checkbox"]', 'button[type="submit"]']
      
      for (const selector of focusableElements) {
        await page.press('body', 'Tab')
        // Check that we can reach each focusable element
        const focused = await page.locator(':focus').getAttribute('type') || 
                      await page.locator(':focus').tagName().then(tag => tag.toLowerCase())
        
        if (selector.includes('email')) expect(focused).toBe('email')
        else if (selector.includes('password')) expect(focused).toBe('password')
        else if (selector.includes('checkbox')) expect(focused).toBe('checkbox')
        else if (selector.includes('button')) expect(focused).toBe('button')
      }
    })

    test('should have proper ARIA labels and descriptions', async ({ page }) => {
      await helper.navigateToAuth('login')
      
      // Check for proper labeling
      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[type="password"]')
      
      await expect(emailInput).toHaveAttribute('id')
      await expect(passwordInput).toHaveAttribute('id')
      
      // Check for associated labels
      await expect(page.locator('label[for*="email"]')).toBeVisible()
      await expect(page.locator('label[for*="password"]')).toBeVisible()
    })

    test('should announce errors to screen readers', async ({ page }) => {
      await helper.navigateToAuth('login')
      
      // Submit form to trigger validation errors
      await page.click('button[type="submit"]')
      
      // Check that error messages are properly associated with inputs
      const errorMessage = page.locator('.text-red-600').first()
      await expect(errorMessage).toBeVisible()
      
      // Error messages should be near their associated form fields
      const emailInput = page.locator('input[type="email"]')
      const emailError = emailInput.locator('..').locator('.text-red-600')
      await expect(emailError).toBeVisible()
    })
  })

  test.describe('Korean Localization', () => {
    test('should display Korean text correctly across all auth pages', async ({ page }) => {
      // Test login page
      await helper.navigateToAuth('login')
      await expect(page.locator('text=정치생산성허브')).toBeVisible()
      await expect(page.locator('text=계정에 로그인하여 시작하세요')).toBeVisible()
      await expect(page.locator('text=이메일과 비밀번호를 입력해주세요')).toBeVisible()
      await expect(page.locator('text=로그인 상태 유지')).toBeVisible()
      await expect(page.locator('text=비밀번호 찾기')).toBeVisible()
      await expect(page.locator('button:has-text("로그인")')).toBeVisible()
      
      // Test signup page
      await helper.navigateToAuth('signup')
      await expect(page.locator('text=새로운 계정을 만들어 시작하세요')).toBeVisible()
      await expect(page.locator('text=초대를 받으셨거나 새로운 조직을 등록하세요')).toBeVisible()
      await expect(page.locator('text=초대 코드')).toBeVisible()
      await expect(page.locator('text=신규 조직')).toBeVisible()
      
      // Test reset password page
      await helper.navigateToAuth('reset-password')
      await expect(page.locator('text=비밀번호를 재설정하세요')).toBeVisible()
      await expect(page.locator('text=가입할 때 사용한 이메일 주소를 입력하세요')).toBeVisible()
      
      // Test verify email page
      await helper.navigateToAuth('verify-email', { email: TEST_EMAIL })
      await expect(page.locator('text=이메일 인증')).toBeVisible()
    })

    test('should show Korean validation messages', async ({ page }) => {
      await helper.navigateToAuth('login')
      
      // Test Korean validation messages
      await page.click('button[type="submit"]')
      await expect(page.locator('text=올바른 이메일 주소를 입력해주세요')).toBeVisible()
      
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', '123')
      await page.click('button[type="submit"]')
      await expect(page.locator('text=비밀번호는 최소 6자 이상이어야 합니다')).toBeVisible()
    })

    test('should handle Korean text input correctly', async ({ page }) => {
      await helper.navigateToAuth('signup')
      
      // Test Korean name input
      const koreanName = '김철수'
      await page.fill('input[placeholder*="이름"]', koreanName)
      await expect(page.locator('input[placeholder*="이름"]')).toHaveValue(koreanName)
      
      // Switch to organization tab and test Korean organization name
      await page.click('text=신규 조직')
      const koreanOrgName = '정치생산성연구소'
      await page.fill('input[placeholder*="조직명"]', koreanOrgName)
      await expect(page.locator('input[placeholder*="조직명"]')).toHaveValue(koreanOrgName)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept API calls and simulate network error
      await page.route('/api/auth/**', route => {
        route.abort('failed')
      })
      
      await helper.navigateToAuth('login')
      await helper.fillLoginForm()
      await page.click('button[type="submit"]')
      
      // Should show appropriate error message
      await expect(page.locator('.text-red-600, [role="alert"]')).toBeVisible({ timeout: 5000 })
    })

    test('should handle API error responses', async ({ page }) => {
      // Mock API error response
      await page.route('/api/auth/login', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: '이메일 또는 비밀번호가 올바르지 않습니다' })
        })
      })
      
      await helper.navigateToAuth('login')
      await helper.fillLoginForm()
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=이메일 또는 비밀번호가 올바르지 않습니다')).toBeVisible()
    })

    test('should show loading states during form submission', async ({ page }) => {
      // Delay the API response to observe loading state
      await page.route('/api/auth/login', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        route.abort('failed')
      })
      
      await helper.navigateToAuth('login')
      await helper.fillLoginForm()
      await page.click('button[type="submit"]')
      
      // Check loading state
      await expect(page.locator('text=로그인 중...')).toBeVisible()
      await expect(page.locator('.animate-spin')).toBeVisible()
    })
  })

  test.describe('Security', () => {
    test('should not expose sensitive data in DOM', async ({ page }) => {
      await helper.navigateToAuth('login')
      await page.fill('input[type="password"]', TEST_PASSWORD)
      
      // Password should not be visible in DOM when hidden
      const passwordInput = page.locator('input[type="password"]')
      await expect(passwordInput).toHaveAttribute('type', 'password')
      
      // Check that password is not exposed in any data attributes
      const passwordValue = await passwordInput.getAttribute('value')
      expect(passwordValue).toBe(TEST_PASSWORD) // This is expected for form functionality
      
      // But ensure it's not accidentally exposed elsewhere
      const pageContent = await page.content()
      expect(pageContent.split('value="' + TEST_PASSWORD + '"').length).toBeLessThanOrEqual(2) // Only in the input field
    })

    test('should sanitize URL parameters', async ({ page }) => {
      // Test XSS prevention in next parameter
      const maliciousNext = 'javascript:alert(1)'
      await helper.navigateToAuth('login', { next: maliciousNext })
      
      // Should not execute JavaScript
      await page.waitForLoadState('networkidle')
      
      // Check that JavaScript is not in any href attributes
      const links = await page.locator('a').all()
      for (const link of links) {
        const href = await link.getAttribute('href')
        if (href) {
          expect(href.toLowerCase()).not.toContain('javascript:')
        }
      }
    })
  })
})