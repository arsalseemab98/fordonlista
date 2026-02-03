import { NextResponse } from 'next/server'
import { processSoldCarsForBuyers } from '@/lib/sold-cars/fetch-buyer'

// Vercel Cron: runs daily at 10:00 Swedish time
// Processes sold cars from 7-30 days ago to fetch buyer data

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

export async function GET() {
  try {
    // Process 10 sold cars at a time
    const result = await processSoldCarsForBuyers(10)

    return NextResponse.json({
      success: true,
      processed: result.processed,
      noOwnerChange: result.noOwnerChange,
      errors: result.errors.slice(0, 5),
      message: `Hämtade köpardata för ${result.processed} sålda bilar (${result.noOwnerChange} utan ägarbyte)`
    })

  } catch (error) {
    console.error('Cron sold-cars error:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}
