import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...')

  // Create auth directory if it doesn't exist
  const authDir = path.join(__dirname, '..', 'playwright', '.auth')
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  // Create browser instance for setup
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Navigate to the application
    const baseURL = config.projects[0].use?.baseURL || 'http://localhost:13000'
    await page.goto(baseURL)

    // Setup mock authentication for testing
    await page.evaluate(() => {
      // Set up localStorage with test auth tokens
      localStorage.setItem('auth_token', 'test-e2e-token')
      localStorage.setItem('tenant_id', 'test-tenant-e2e')
      localStorage.setItem('user_id', 'test-user-123')
      localStorage.setItem('user_role', 'admin')
      
      // Set up sessionStorage if needed
      sessionStorage.setItem('session_id', 'test-session-456')
    })

    // Set up cookies for authentication if needed
    await page.context().addCookies([
      {
        name: 'auth_session',
        value: 'test-session-cookie',
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax'
      }
    ])

    // Save auth state for reuse in tests
    await page.context().storageState({ 
      path: path.join(authDir, 'user.json') 
    })

    console.log('✅ Authentication state saved successfully')

    // Verify the app is accessible
    await page.goto(`${baseURL}/analytics/dashboard`)
    
    // Wait for the page to load properly
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    console.log('✅ Application accessibility verified')

  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }

  console.log('🎉 Global setup completed successfully')
}

export default globalSetup