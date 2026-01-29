import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const ENV_FILE_PATH = path.join(process.env.HOME || '', 'Desktop', 'biluppgifter-api', '.env')

export async function POST(request: NextRequest) {
  try {
    const { envContent } = await request.json()

    if (!envContent || typeof envContent !== 'string') {
      return NextResponse.json({ success: false, error: 'Inget innehåll angett' }, { status: 400 })
    }

    // Parse the env content to validate
    const lines = envContent.trim().split('\n')
    const envVars: Record<string, string> = {}

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim()
        const value = trimmed.substring(eqIndex + 1).trim()
        envVars[key] = value
      }
    }

    // Require at least session or cf_clearance
    if (!envVars.BILUPPGIFTER_SESSION && !envVars.BILUPPGIFTER_CF_CLEARANCE) {
      return NextResponse.json({
        success: false,
        error: 'Ingen BILUPPGIFTER_SESSION eller BILUPPGIFTER_CF_CLEARANCE hittades'
      }, { status: 400 })
    }

    // Check if directory exists
    const dirPath = path.dirname(ENV_FILE_PATH)
    if (!existsSync(dirPath)) {
      return NextResponse.json({
        success: false,
        error: `Mappen ${dirPath} finns inte`
      }, { status: 400 })
    }

    // Read existing .env if it exists and merge
    let existingVars: Record<string, string> = {}
    if (existsSync(ENV_FILE_PATH)) {
      try {
        const existingContent = await readFile(ENV_FILE_PATH, 'utf-8')
        for (const line of existingContent.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const eqIndex = trimmed.indexOf('=')
          if (eqIndex > 0) {
            const key = trimmed.substring(0, eqIndex).trim()
            const value = trimmed.substring(eqIndex + 1).trim()
            existingVars[key] = value
          }
        }
      } catch {
        // Ignore read errors, we'll create a new file
      }
    }

    // Merge new values with existing (new values override)
    const mergedVars = { ...existingVars, ...envVars }

    // Build new .env content
    const newContent = Object.entries(mergedVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n'

    // Write to file
    await writeFile(ENV_FILE_PATH, newContent, 'utf-8')

    return NextResponse.json({
      success: true,
      message: 'Cookies sparade till .env-filen',
      savedKeys: Object.keys(envVars)
    })

  } catch (error) {
    console.error('Error saving .env file:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Okänt fel vid sparande'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    if (!existsSync(ENV_FILE_PATH)) {
      return NextResponse.json({
        success: false,
        exists: false,
        error: '.env-filen finns inte'
      })
    }

    const content = await readFile(ENV_FILE_PATH, 'utf-8')
    const lines = content.split('\n')
    const keys = lines
      .filter(line => line.trim() && !line.trim().startsWith('#'))
      .map(line => {
        const eqIndex = line.indexOf('=')
        return eqIndex > 0 ? line.substring(0, eqIndex).trim() : null
      })
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      exists: true,
      keys,
      path: ENV_FILE_PATH
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Kunde inte läsa .env'
    }, { status: 500 })
  }
}
