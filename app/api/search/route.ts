import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeHybridSearch } from '@/lib/search/hybrid-search'

export const dynamic = 'force-dynamic'

const MAX_QUERY_LENGTH = 500
const MAX_LIMIT = 50

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate query parameter
    const searchParams = request.nextUrl.searchParams
    const rawQuery = searchParams.get('q')

    if (!rawQuery || rawQuery.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    const trimmedQuery = rawQuery.trim()

    if (trimmedQuery.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Search query exceeds maximum length of ${MAX_QUERY_LENGTH} characters` },
        { status: 400 }
      )
    }

    const limitParam = searchParams.get('limit')
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 20
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_LIMIT) : 20

    const docIdParam = searchParams.get('documentId') || undefined

    // 3. Execute hybrid search
    const results = await executeHybridSearch(supabase, trimmedQuery, {
      limit,
      documentId: docIdParam,
    })

    return NextResponse.json({
      success: true,
      query: trimmedQuery,
      results,
    })
  } catch (error: unknown) {
    console.error('[Search] Internal API error:', error)
    return NextResponse.json(
      { error: 'Search operation failed. Please try again.' },
      { status: 500 }
    )
  }
}
