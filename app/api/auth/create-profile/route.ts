import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types'
import { createProfile } from '@/lib/auth/actions'

export async function POST(request: Request) {
  try {
    const { userId, fullName, email } = await request.json()

    if (!userId || !email) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create profile using server action
    const result = await createProfile(userId, email, fullName)

    if (!result.success) {
      return Response.json(
        { error: 'Failed to create profile', details: result.error },
        { status: 500 }
      )
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Create profile API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
