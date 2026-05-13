'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'
import { Transaction, TransactionItem } from '@/types'
import { QRCodeSVG } from 'qrcode.react'

interface ReceiptProps {
  transaction: Transaction & { items: TransactionItem[] }
  cashierName: string
  storeName?: string
  storeAddress?: string
  storePhone?: string
  storeEmail?: string
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({
  transaction,
  cashierName,
  storeName = 'POS Toko',
  storeAddress = '',
  storePhone = '',
  storeEmail = '',
}, ref) => {
  const receiptRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => receiptRef.current!)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTransactionId = (id: string) => {
    return id.toUpperCase().slice(-8)
  }

  return (
    <div
      ref={receiptRef}
      className="bg-card p-4 font-mono text-xs leading-tight"
      style={{
        width: '80mm',
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        lineHeight: '1.2',
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold">{storeName}</h1>
        {storeAddress && <p className="text-xs">{storeAddress}</p>}
        {storePhone && <p className="text-xs">{storePhone}</p>}
        {storeEmail && <p className="text-xs">{storeEmail}</p>}
        <div className="border-t border-b border-foreground py-1 mt-2">
          <p className="text-xs font-bold">*** RECEIPT ***</p>
        </div>
      </div>

      {/* Transaction Info */}
      <div className="mb-3">
        <div className="flex justify-between">
          <span>Transaction ID:</span>
          <span>{getTransactionId(transaction.id)}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{formatDate(transaction.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier:</span>
          <span>{cashierName}</span>
        </div>
        {transaction.paid_at && (
          <div className="flex justify-between">
            <span>Paid:</span>
            <span>{formatDate(transaction.paid_at)}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="mb-3">
        <div className="border-t border-b border-dashed border-border py-1">
          <div className="flex justify-between font-bold">
            <span>ITEMS</span>
            <span>AMOUNT</span>
          </div>
        </div>
        
        {transaction.items.map((item, index) => (
          <div key={index} className="mb-1">
            <div className="flex justify-between">
              <span className="flex-1">
                {item.product_name || 'Unknown Product'}
                {item.variant_name && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({item.variant_name})
                  </span>
                )}
              </span>
              <span>{formatCurrency(item.subtotal)}</span>
            </div>
            <div className="text-xs text-muted-foreground ml-2">
              {item.variant_name ? (
                <>
                  {item.qty} × {formatCurrency(item.unit_price)}
                  {item.barcode && (
                    <span className="ml-2">
                      • {item.barcode}
                    </span>
                  )}
                </>
              ) : (
                <>
                  {item.qty} × {formatCurrency(item.unit_price)}
                  {item.barcode && (
                    <span className="ml-2">
                      • {item.barcode}
                    </span>
                  )}
                </>
              )}
            </div>
            {/* Additional variant details */}
            {item.variant_name && (
              <div className="text-xs text-muted-foreground ml-4 mt-1">
                <span>Variant: {item.variant_name}</span>
                {item.barcode && (
                  <span className="ml-2">Code: {item.barcode}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Transaction Details */}
      <div className="mb-3">
        <div className="border-t border-b border-dashed border-border py-1">
          <div className="font-bold text-center mb-1">TRANSACTION DETAILS</div>
        </div>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Total Items:</span>
            <span>{transaction.items.reduce((sum, item) => sum + item.qty, 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Unique Products:</span>
            <span>{transaction.items.length}</span>
          </div>
          {transaction.items.some(item => item.variant_name) && (
            <div className="flex justify-between">
              <span>With Variants:</span>
              <span>{transaction.items.filter(item => item.variant_name).length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-b border-dashed border-border py-1">
        {transaction.discount_amount > 0 && (
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(transaction.subtotal)}</span>
          </div>
        )}
        {transaction.discount_amount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{formatCurrency(transaction.discount_amount)}</span>
          </div>
        )}
        {transaction.tax_amount > 0 && (
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>{formatCurrency(transaction.tax_amount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>TOTAL:</span>
          <span>{formatCurrency(transaction.total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Payment:</span>
          <span>{transaction.payment_method === 'cash' ? 'Cash' : transaction.payment_method === 'qris' ? 'QRIS GoPay' : transaction.payment_method}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid:</span>
          <span>{formatCurrency(transaction.amount_paid)}</span>
        </div>
        <div className="flex justify-between">
          <span>Change:</span>
          <span>{formatCurrency(transaction.change_amount)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center">
        <p className="text-xs mb-2">Thank you for your purchase!</p>
        
        {/* QR Code for digital verification */}
        <div className="flex justify-center mb-2">
          <QRCodeSVG
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/receipt/${transaction.id}`}
            size={64}
            level="L"
          />
        </div>
        <p className="text-xs text-muted-foreground">Scan for digital receipt</p>
        
        <div className="mt-3 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            This is a computer-generated receipt
          </p>
          <p className="text-xs text-muted-foreground">
            No signature required
          </p>
        </div>
      </div>
    </div>
  )
})

Receipt.displayName = 'Receipt'
