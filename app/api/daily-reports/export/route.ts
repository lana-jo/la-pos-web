import { supabaseServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date') || new Date().toISOString().split('T')[0]
    const endDate = searchParams.get('end_date') || startDate
    const exportFormat = searchParams.get('format') || 'json'

    const supabase = supabaseServer
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

    // Fetch daily reports for the date range
    const { data: reports, error: reportsError } = await supabase
      .from('daily_reports')
      .select('*')
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .order('report_date', { ascending: true }) as { data: any[] | null; error: any }

    if (reportsError) {
      console.error('Error fetching reports for export:', reportsError)
      return NextResponse.json(
        { error: 'Failed to fetch reports for export' },
        { status: 500 }
      )
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json(
        { error: 'No reports found for the specified date range' },
        { status: 404 }
      )
    }

    // Format reports for export
    const formattedReports = reports.map(report => ({
      'Report Date': report.report_date,
      'Total Sales (IDR)': (report.total_sales).toLocaleString('id-ID'),
      'Total Transactions': report.total_transactions,
      'Paid Transactions': report.paid_transactions,
      'Pending Transactions': report.pending_transactions,
      'Cancelled Transactions': report.cancelled_transactions,
      'Expired Transactions': report.expired_transactions,
      'Average Transaction Value (IDR)': (report.average_transaction_value).toLocaleString('id-ID'),
      'Total Items Sold': report.total_items_sold,
      'Generated At': new Date(report.created_at).toLocaleString('id-ID'),
      'Last Updated': new Date(report.updated_at).toLocaleString('id-ID')
    }))

    if (exportFormat === 'csv') {
      // Generate CSV
      const headers = Object.keys(formattedReports[0])
      const csvRows = [
        headers.join(','),
        ...formattedReports.map(report => 
          headers.map(header => {
            const value = report[header as keyof typeof report]
            // Escape commas and quotes in CSV values
            const stringValue = String(value).replace(/"/g, '""')
            return `"${stringValue}"`
          }).join(',')
        )
      ]

      const csvContent = csvRows.join('\n')
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="daily-income-report-${startDate}-to-${endDate}.csv"`
        }
      })
    }

    // Default: JSON format
    const exportData = {
      export_info: {
        start_date: startDate,
        end_date: endDate,
        generated_at: new Date().toISOString(),
        total_reports: reports.length,
        format: 'json'
      },
      summary: {
        total_sales: reports.reduce((sum, r) => sum + r.total_sales, 0),
        total_transactions: reports.reduce((sum, r) => sum + r.total_transactions, 0),
        total_items_sold: reports.reduce((sum, r) => sum + r.total_items_sold, 0),
        average_daily_sales: (reports.reduce((sum, r) => sum + r.total_sales, 0) / reports.length)
      },
      reports: formattedReports
    }

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="daily-income-report-${startDate}-to-${endDate}.json"`
      }
    })

  } catch (error) {
    console.error('Error exporting daily reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
