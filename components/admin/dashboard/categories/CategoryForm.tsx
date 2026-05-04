'use client'

import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'

interface CategoryFormData {
    name: string
    slug: string
    icon: string
    color: string
    sort_order: number
    is_active: boolean
}

interface CategoryFormProps {
    formData: CategoryFormData
    setFormData: (data: CategoryFormData) => void
    isSubmitting: boolean
    isEdit?: boolean
}

export default function CategoryForm({formData, setFormData, isSubmitting, isEdit = false}: CategoryFormProps) {
    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor={isEdit ? "edit-name" : "name"}>Nama Kategori</Label>
                <Input
                    id={isEdit ? "edit-name" : "name"}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Masukkan nama kategori"
                    disabled={isSubmitting}
                />
            </div>

            <div>
                <Label htmlFor={isEdit ? "edit-slug" : "slug"}>Slug {isEdit ? "" : "(Opsional)"}</Label>
                <Input
                    id={isEdit ? "edit-slug" : "slug"}
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    placeholder={isEdit ? "URL-friendly name" : "auto-generate dari nama"}
                    disabled={isSubmitting}
                />
            </div>

            <div>
                <Label htmlFor={isEdit ? "edit-icon" : "icon"}>Icon (Emoji)</Label>
                <Input
                    id={isEdit ? "edit-icon" : "icon"}
                    value={formData.icon}
                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    placeholder="📁 atau emoji lainnya"
                    disabled={isSubmitting}
                />
            </div>

            <div>
                <Label htmlFor={isEdit ? "edit-color" : "color"}>Warna</Label>
                <div className="flex gap-2">
                    <Input
                        id={isEdit ? "edit-color" : "color"}
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                        className="w-20 h-10"
                        disabled={isSubmitting}
                    />
                    <Input
                        value={formData.color}
                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                        placeholder="#6366f1"
                        disabled={isSubmitting}
                    />
                </div>
            </div>

            <div>
                <Label htmlFor={isEdit ? "edit-sort_order" : "sort_order"}>Urutan</Label>
                <Input
                    id={isEdit ? "edit-sort_order" : "sort_order"}
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    disabled={isSubmitting}
                />
            </div>

            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id={isEdit ? "edit-is_active" : "is_active"}
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    disabled={isSubmitting}
                />
                <Label htmlFor={isEdit ? "edit-is_active" : "is_active"} className="ml-2">
                    Aktif
                </Label>
            </div>
        </div>
    )
}
