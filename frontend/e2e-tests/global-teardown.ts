import { FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...')

  try {
    // Clean up auth files
    const authDir = path.join(__dirname, '..', 'playwright', '.auth')
    
    if (fs.existsSync(authDir)) {
      const authFiles = fs.readdirSync(authDir)
      
      for (const file of authFiles) {
        const filePath = path.join(authDir, file)
        fs.unlinkSync(filePath)
        console.log(`🗑️ Cleaned up auth file: ${file}`)
      }
      
      // Remove auth directory if empty
      try {
        fs.rmdirSync(authDir)
        console.log('🗑️ Removed auth directory')
      } catch (error) {
        // Directory might not be empty, that's okay
      }
    }

    // Clean up temporary test files if any
    const testResultsDir = path.join(__dirname, '..', 'test-results')
    if (fs.existsSync(testResultsDir)) {
      console.log('📊 Test results preserved in test-results/ directory')
    }

    // Clean up any playwright cache if needed
    const playwrightDir = path.join(__dirname, '..', 'playwright')
    const cacheFiles = ['downloads', 'temp']
    
    for (const cacheDir of cacheFiles) {
      const cachePath = path.join(playwrightDir, cacheDir)
      if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true })
        console.log(`🗑️ Cleaned up cache directory: ${cacheDir}`)
      }
    }

    console.log('✅ Global teardown completed successfully')

  } catch (error) {
    console.error('❌ Global teardown encountered an error:', error)
    // Don't throw error in teardown to avoid masking test results
  }
}

export default globalTeardown