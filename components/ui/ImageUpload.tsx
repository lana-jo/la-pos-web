'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ImageUploadProps {
  currentImageUrl?: string | null
  onImageChange: (file: File | null) => void
  disabled?: boolean
  className?: string
}

export function ImageUpload({
  currentImageUrl,
  onImageChange,
  disabled = false,
  className = ''
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return

    console.log('🖼️ [CLIENT] File selected for upload', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    })

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.log('❌ [CLIENT] Invalid file type', { fileType: file.type })
      toast.error('Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.log('❌ [CLIENT] File too large', { fileSize: file.size, maxSize })
      toast.error('Ukuran file terlalu besar. Maksimal 5MB.')
      return
    }

    console.log('✅ [CLIENT] File validation passed')

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      console.log('🖼️ [CLIENT] Preview generated')
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Pass file to parent
    console.log('📤 [CLIENT] Passing file to parent component')
    onImageChange(file)
  }, [onImageChange])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    console.log('🎯 [CLIENT] Drag over detected')
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    console.log('🎯 [CLIENT] Drag leave detected')
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    console.log('📂 [CLIENT] Files dropped', { 
      fileCount: e.dataTransfer.files.length,
      files: Array.from(e.dataTransfer.files).map(f => ({ name: f.name, type: f.type, size: f.size }))
    })

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))
    
    if (imageFile) {
      console.log('✅ [CLIENT] Image file found in drop', { fileName: imageFile.name })
      handleFileSelect(imageFile)
    } else {
      console.log('❌ [CLIENT] No image file found in drop')
      toast.error('Silakan upload file gambar')
    }
  }, [handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log('📁 [CLIENT] File selected via input', { fileName: file.name })
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleRemoveImage = useCallback(() => {
    console.log('🗑️ [CLIENT] Image removed by user')
    setPreviewUrl(null)
    onImageChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onImageChange])

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  return (
    <div className={`space-y-3 ${className}`}>
      <Label>Gambar Produk</Label>
      
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Mengupload...</p>
          </div>
        ) : previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="mx-auto max-h-48 rounded-lg object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveImage()
              }}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop gambar di sini atau klik untuk memilih
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, atau WebP (maks. 5MB)
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
