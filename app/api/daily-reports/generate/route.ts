import { supabaseServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function createClient(useServiceRole = false) {
  if (useServiceRole) {
    return supabaseServer
  }
  return supabaseServer
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    // Verify this is a service request (for cron jobs) or authorized user
    const authHeader = request.headers.get('authorization')
    const isServiceRequest = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    
    if (!isServiceRequest) {
      // For manual requests, verify user is admin
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single() as { data: { role: string } | null; error: any }

      if (error || profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    // Create service role client for database operations
    const serviceClient = createClient(true)
    
    // Call the database function to generate the daily report
    const { data, error } = await (serviceClient as any).rpc('generate_daily_report', { target_date: targetDate })

    if (error) {
      console.error('Database error generating daily report:', error)
      return NextResponse.json(
        { error: 'Failed to generate daily report', details: error.message },
        { status: 500 }
      )
    }

    // Fetch the generated report for response
    if (!data) {
      return NextResponse.json(
        { error: 'Failed to generate report' },
        { status: 500 }
      )
    }

    const { data: report, error: fetchError } = await serviceClient
      .from('daily_reports')
      .select('*')
      .eq('id', data)
      .single() as { data: any | null; error: any }

    if (fetchError) {
      console.error('Error fetching generated report:', fetchError)
      return NextResponse.json(
        { error: 'Report generated but failed to fetch details', reportId: data },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        total_sales: report?.total_sales, // Keep as IDR
        average_transaction_value: report?.average_transaction_value
      },
      message: `Daily report generated for ${targetDate}`
    })

  } catch (error) {
    console.error('Error in daily report generation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '30')

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single() as { data: { role: string } | null; error: any }

    if (profileError || !profile?.role || !['admin', 'cashier'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let query = supabase
      .from('daily_reports')
      .select('*')
      .order('report_date', { ascending: false })
      .limit(limit)

    if (startDate) {
      query = query.gte('report_date', startDate)
    }
    if (endDate) {
      query = query.lte('report_date', endDate)
    }

    const { data: reports, error } = await query

    if (error) {
      console.error('Error fetching daily reports:', error)
      return NextResponse.json(
        { error: 'Failed to fetch daily reports' },
        { status: 500 }
      )
    }

    // Use full IDR values
    const formattedReports = reports?.map((report: any) => ({
      ...report,
      total_sales: report.total_sales,
      average_transaction_value: report.average_transaction_value
    })) || []

    return NextResponse.json({
      success: true,
      reports: formattedReports
    })

  } catch (error) {
    console.error('Error fetching daily reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
