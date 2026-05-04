import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database, MidtransWebhookPayload } from '@/types'
import crypto from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus = 'paid' | 'expired' | 'cancelled' | 'pending'

type TransactionRow = {
  id: string
  payment_status: PaymentStatus
}

// ─── Supabase (service role — bypasses RLS, safe for server-only routes) ──────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
).from('transactions') as any

// ─── Helpers ──────────────────────────────────────────────────────────────────

function verifyMidtransSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string
): boolean {
  const expected = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${process.env.MIDTRANS_SERVER_KEY!}`)
      .digest('hex')

  return signatureKey === expected
}

function resolveStatus(transactionStatus: string): { status: PaymentStatus; paidAt: string | null } {
  switch (transactionStatus) {
    case 'settlement': return { status: 'paid',      paidAt: new Date().toISOString() }
    case 'expire':     return { status: 'expired',   paidAt: null }
    case 'cancel':     return { status: 'cancelled', paidAt: null }
    default:           return { status: 'pending',   paidAt: null }
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: MidtransWebhookPayload = await request.json()

    // Verify webhook signature
    const isValid = verifyMidtransSignature(
        body.order_id,
        body.status_code,
        body.gross_amount,
        body.signature_key
    )

    if (!isValid) {
      console.error('Invalid webhook signature for order:', body.order_id)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Fetch transaction
    const { data: transaction, error: fetchError } = await db()
        .select('id, payment_status')
        .eq('midtrans_order_id', body.order_id)
        .single() as { data: TransactionRow | null; error: unknown }

    if (fetchError || !transaction) {
      console.error('Transaction not found:', body.order_id)
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Idempotency — skip if already paid
    if (transaction.payment_status === 'paid') {
      return NextResponse.json({ status: 'ok', message: 'Transaction already paid' })
    }

    // Update status
    const { status: newStatus, paidAt } = resolveStatus(body.transaction_status)

    const { error: updateError } = await db()
        .update({ payment_status: newStatus, paid_at: paidAt })
        .eq('id', transaction.id)

    if (updateError) {
      console.error('Error updating transaction:', updateError)
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
    }

    return NextResponse.json({ status: 'ok', message: 'Webhook processed successfully' })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}