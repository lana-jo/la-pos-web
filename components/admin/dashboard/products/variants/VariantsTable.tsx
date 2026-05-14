import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2 } from 'lucide-react'
import { ProductVariant } from '@/types'

interface VariantsTableProps {
  variants: (ProductVariant & { product_name: string; unit_name?: string })[]
  onEdit: (variant: ProductVariant & { product_name: string }) => void
  onDelete: (variant: ProductVariant & { product_name: string }) => void
}

export function VariantsTable({ variants, onEdit, onDelete }: VariantsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Produk</th>
            <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Varian</th>
            <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Barcode</th>
            <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Harga Jual</th>
            <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Konversi</th>
            <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Satuan</th>
            <th className="px-4 py-3 font-bold text-muted-foreground uppercase">Status</th>
            <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {variants.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                Belum ada data varian
              </td>
            </tr>
          ) : (
            variants.map((variant) => (
              <tr key={variant.id} className="hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{variant.product_name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{variant.variant_name}</span>
                    {variant.is_default && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">Default</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{variant.barcode || '-'}</td>
                <td className="px-4 py-3 text-primary-brand font-black">
                  Rp {variant.price.toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-3 text-foreground">
                  1 {variant.variant_name} = {variant.conversion_qty} unit
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{variant.unit_name || '-'}</td>
                <td className="px-4 py-3">
                  <Badge variant={variant.is_active ? "default" : "secondary"} className={variant.is_active ? "bg-green-100 text-green-800" : ""}>
                    {variant.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(variant)} className="text-primary-brand hover:bg-primary-brand/10">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(variant)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
