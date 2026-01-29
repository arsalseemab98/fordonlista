'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// API endpoint to receive cookies from browser
export async function POST(request: NextRequest) {
  try {
    const { session, cf_clearance, antiforgery, source } = await request.json()

    if (!session || !cf_clearance) {
      return NextResponse.json({
        success: false,
        error: 'session och cf_clearance krävs'
      }, { status: 400 })
    }

    const supabase = await createClient()

    const cookieJson = JSON.stringify({
      session,
      cf_clearance,
      antiforgery: antiforgery || undefined
    })

    // Check if settings exist
    const { data: existing } = await supabase
      .from('api_tokens')
      .select('id')
      .eq('service_name', 'biluppgifter')
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('api_tokens')
        .update({
          refresh_token: cookieJson,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating biluppgifter cookies:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
    } else {
      const { error } = await supabase
        .from('api_tokens')
        .insert({
          service_name: 'biluppgifter',
          refresh_token: cookieJson
        })

      if (error) {
        console.error('Error creating biluppgifter cookies:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
    }

    console.log(`[save-cookies] Cookies saved from ${source || 'unknown'}`)

    return NextResponse.json({
      success: true,
      message: 'Cookies sparade!',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Save cookies error:', error)
    return NextResponse.json({
      success: false,
      error: 'Kunde inte spara cookies'
    }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    usage: 'POST with { session, cf_clearance, antiforgery? }'
  })
}
