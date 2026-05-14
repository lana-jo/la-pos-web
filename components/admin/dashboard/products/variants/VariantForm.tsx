import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw } from 'lucide-react'
import { generateBarcode } from '@/lib/pos/utils'
import { toast } from 'sonner'

interface VariantFormProps {
  formData: any
  setFormData: (data: any) => void
  isSubmitting: boolean
  products: any[]
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isEdit: boolean
}

export function VariantForm({ formData, setFormData, isSubmitting, products, onSubmit, onCancel, isEdit }: VariantFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="product_id" className="pos-form-label">Produk *</Label>
        <select
          id="product_id"
          value={formData.product_id}
          onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
          disabled={isSubmitting || isEdit}
          className="w-full p-2 border border-border bg-background rounded-lg pos-form-input"
          required
        >
          <option value="">-- Pilih Produk --</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.barcode})
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="variant_name" className="pos-form-label">Nama Varian *</Label>
        <Input
          id="variant_name"
          value={formData.variant_name}
          onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })}
          placeholder="Eceran, Grosir, Box, Dus..."
          disabled={isSubmitting}
          required
          className="pos-form-input"
        />
      </div>

      <div>
        <Label htmlFor="barcode" className="pos-form-label">Barcode</Label>
        <div className="flex gap-2">
          <Input
            id="barcode"
            value={formData.barcode}
            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            placeholder="Barcode khusus untuk varian ini"
            disabled={isSubmitting}
            className="pos-form-input"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              const newBarcode = generateBarcode()
              setFormData({ ...formData, barcode: newBarcode })
              toast.success(`Barcode varian digenerate: ${newBarcode}`)
            }}
            disabled={isSubmitting}
            title="Buat Barcode"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price" className="pos-form-label">Harga Jual (IDR) *</Label>
          <Input
            id="price"
            type="number"
            min={0}
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="0"
            disabled={isSubmitting}
            required
            className="pos-form-input"
          />
        </div>
        <div>
          <Label htmlFor="cost_price" className="pos-form-label">Harga Beli (IDR)</Label>
          <Input
            id="cost_price"
            type="number"
            min={0}
            value={formData.cost_price}
            onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
            placeholder="0"
            disabled={isSubmitting}
            className="pos-form-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="conversion_qty" className="pos-form-label">Faktor Konversi *</Label>
          <Input
            id="conversion_qty"
            type="number"
            min={1}
            value={formData.conversion_qty}
            onChange={(e) => setFormData({ ...formData, conversion_qty: e.target.value })}
            placeholder="1"
            disabled={isSubmitting}
            required
            className="pos-form-input"
          />
        </div>
        <div>
          <Label htmlFor="min_qty" className="pos-form-label">Minimum Qty</Label>
          <Input
            id="min_qty"
            type="number"
            min={1}
            value={formData.min_qty}
            onChange={(e) => setFormData({ ...formData, min_qty: e.target.value })}
            placeholder="1"
            disabled={isSubmitting}
            className="pos-form-input"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 py-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            disabled={isSubmitting}
          />
          <Label htmlFor="is_active">Aktif</Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_default"
            checked={formData.is_default}
            onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
            disabled={isSubmitting}
          />
          <Label htmlFor="is_default">Default</Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="inherit_cost_price"
            checked={formData.inherit_cost_price}
            onChange={(e) => setFormData({ ...formData, inherit_cost_price: e.target.checked })}
            disabled={isSubmitting}
          />
          <Label htmlFor="inherit_cost_price">Auto Harga Beli</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting} className="pos-button-primary">
          {isSubmitting ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
