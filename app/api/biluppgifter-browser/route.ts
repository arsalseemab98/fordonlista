import { NextRequest, NextResponse } from 'next/server'

// This endpoint is called by the frontend to request biluppgifter data
// The actual fetching happens through the Chrome extension (browser session)
// This just stores/retrieves the results

export async function POST(request: NextRequest) {
  try {
    const { action, regnr, data } = await request.json()

    if (action === 'store-result') {
      // Chrome extension sends scraped data here
      // We'll store it in memory temporarily or process it
      console.log(`[biluppgifter-browser] Received data for ${regnr}:`, data)

      return NextResponse.json({
        success: true,
        message: 'Data received'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown action'
    }, { status: 400 })

  } catch (error) {
    console.error('Biluppgifter browser error:', error)
    return NextResponse.json({
      success: false,
      error: 'Server error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'Biluppgifter browser-based fetching endpoint'
  })
}
