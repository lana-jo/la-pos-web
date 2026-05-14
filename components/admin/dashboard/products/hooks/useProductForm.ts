import { useState } from 'react'
import { FormData, FormVariant } from '@/components/admin/dashboard/products'

export const EMPTY_FORM: FormData = {
    name: '',
    barcode: '',
    description: '',
    cost_price: '',
    price: '',
    stock: '',
    min_stock: '',
    max_stock: '',
    track_stock: true,
    low_stock_threshold: '5',
    category_id: '',
    unit_id: '',
    supplier_id: '',
    image_url: '',
    is_active: true,
    is_consignment: false,
    variants: [],
}

export function useProductForm() {
    const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
    
    const resetForm = () => setFormData(EMPTY_FORM)

    return { formData, setFormData, resetForm }
}
