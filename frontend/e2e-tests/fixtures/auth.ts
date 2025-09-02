import { Page } from '@playwright/test'

export interface TestUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'viewer'
  tenantId: string
}

export const testUsers: Record<string, TestUser> = {
  admin: {
    id: 'admin-123',
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'admin',
    tenantId: 'test-tenant-admin'
  },
  user: {
    id: 'user-456',
    email: 'user@test.com', 
    name: 'Test User',
    role: 'user',
    tenantId: 'test-tenant-user'
  },
  viewer: {
    id: 'viewer-789',
    email: 'viewer@test.com',
    name: 'Test Viewer', 
    role: 'viewer',
    tenantId: 'test-tenant-viewer'
  }
}

export async function setupMockAuth(page: Page, userType: keyof typeof testUsers = 'admin') {
  const user = testUsers[userType]
  
  // Setup localStorage auth
  await page.evaluate((userData) => {
    localStorage.setItem('auth_token', `test-token-${userData.id}`)
    localStorage.setItem('tenant_id', userData.tenantId)
    localStorage.setItem('user_id', userData.id)
    localStorage.setItem('user_role', userData.role)
    localStorage.setItem('user_email', userData.email)
    localStorage.setItem('user_name', userData.name)
  }, user)

  // Setup cookies
  await page.context().addCookies([
    {
      name: 'auth_session',
      value: `session-${user.id}`,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax'
    },
    {
      name: 'tenant_context',
      value: user.tenantId,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax'
    }
  ])

  return user
}

export async function mockAuthFailure(page: Page, errorType: 'unauthorized' | 'forbidden' | 'token_expired' = 'unauthorized') {
  // Mock auth API endpoints to return error responses
  await page.route('/api/auth/**', (route) => {
    const statusCode = {
      unauthorized: 401,
      forbidden: 403,
      token_expired: 401
    }[errorType]

    const errorMessage = {
      unauthorized: 'Authentication required',
      forbidden: 'Access denied', 
      token_expired: 'Token has expired'
    }[errorType]

    route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify({ 
        error: errorMessage,
        code: errorType
      })
    })
  })
}

export async function clearAuth(page: Page) {
  // Clear localStorage
  await page.evaluate(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('tenant_id')
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_name')
    sessionStorage.clear()
  })

  // Clear cookies
  await page.context().clearCookies()
}

export async function setupTenantIsolation(page: Page, allowedTenant: string, blockedTenants: string[] = []) {
  await page.route('/api/**', (route) => {
    const headers = route.request().headers()
    const tenantId = headers['x-tenant-id'] || headers['X-Tenant-ID']
    
    if (!tenantId) {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Missing tenant ID' })
      })
      return
    }

    if (blockedTenants.includes(tenantId)) {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Access denied for tenant' })
      })
      return
    }

    if (tenantId !== allowedTenant) {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Tenant access forbidden' })
      })
      return
    }

    // Continue with normal request
    route.continue()
  })
}