'use client'

import React, { useRef } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function UploadButton({ onFileSelect }: { onFileSelect?: (file: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect?.(e.target.files[0])
    }
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept="application/pdf"
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2"
      >
        <Upload className="h-4 w-4" />
        Upload PDF
      </Button>
    </>
  )
}
