import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types'
import { QRISChargeResponse } from '@/types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const midtransServerKey = process.env.MIDTRANS_SERVER_KEY!
const midtransApiUrl = process.env.MIDTRANS_API_URL || 'https://api.midtrans.com'

export async function createQRISCharge(
  orderId: string,
  grossAmount: number
): Promise<QRISChargeResponse> {
  const payload = {
    payment_type: 'qris',
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    qris: {
      acquirer: 'gopay',
    },
    custom_field: {
      custom_field1: 'POS System',
      custom_field2: orderId,
    },
  }

  const authString = Buffer.from(`${midtransServerKey}:`).toString('base64')

  try {
    const response = await fetch(`${midtransApiUrl}/v2/charge`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Midtrans API error: ${response.status} - ${errorText}`)
    }

    const result: QRISChargeResponse = await response.json()
    
    if (result.status_code !== '201') {
      throw new Error(`Midtrans charge failed: ${result.status_message}`)
    }

    return result
  } catch (error) {
    console.error('Midtrans charge error:', error)
    throw error
  }
}

export async function saveQRISToDatabase(
  transactionId: string,
  midtransResponse: QRISChargeResponse
) {
  try {
    const { error } = await (supabase as any)
        .from('transactions')
      .update({
        midtrans_order_id: midtransResponse.order_id,
        qris_url: midtransResponse.qris_url,
        qris_string: midtransResponse.qris_string,
        qris_expires_at: midtransResponse.expiry_time,
      })
      .eq('id', transactionId)

    if (error) {
      console.error('Error saving QRIS to database:', error)
      throw error
    }
  } catch (error) {
    console.error('Database save error:', error)
    throw error
  }
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const expectedSignature = require('crypto')
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${midtransServerKey}`)
    .digest('hex')

  return signatureKey === expectedSignature
}
