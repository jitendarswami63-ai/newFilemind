import React from 'react'
import {
  FileText,
  Image as ImageIcon,
  Table,
  Presentation,
  Video,
  Music,
  Archive,
  Code2,
  File,
} from 'lucide-react'
import { detectFileFormat, FileCategory } from './file-types'

export interface FileIconMeta {
  icon: React.ComponentType<{ className?: string }>
  bgColor: string
  borderColor: string
  textColor: string
  badgeBg: string
  badgeText: string
  label: string
}

export function getFileCategoryTheme(category: FileCategory): FileIconMeta {
  switch (category) {
    case 'document':
      return {
        icon: FileText,
        bgColor: 'bg-[#FDF2F2]',
        borderColor: 'border-[#F8D7DA]',
        textColor: 'text-[#B91C1C]',
        badgeBg: 'bg-[#FDF2F2]',
        badgeText: 'text-[#B91C1C]',
        label: 'Document',
      }
    case 'spreadsheet':
      return {
        icon: Table,
        bgColor: 'bg-[#EBF7EE]',
        borderColor: 'border-[#C3E6CB]',
        textColor: 'text-[#1E7E34]',
        badgeBg: 'bg-[#EBF7EE]',
        badgeText: 'text-[#1E7E34]',
        label: 'Spreadsheet',
      }
    case 'image':
      return {
        icon: ImageIcon,
        bgColor: 'bg-[#F5F3FF]',
        borderColor: 'border-[#DDD6FE]',
        textColor: 'text-[#7C3AED]',
        badgeBg: 'bg-[#F5F3FF]',
        badgeText: 'text-[#7C3AED]',
        label: 'Image',
      }
    case 'presentation':
      return {
        icon: Presentation,
        bgColor: 'bg-[#FFFBEB]',
        borderColor: 'border-[#FDE68A]',
        textColor: 'text-[#D97706]',
        badgeBg: 'bg-[#FFFBEB]',
        badgeText: 'text-[#D97706]',
        label: 'Presentation',
      }
    case 'video':
      return {
        icon: Video,
        bgColor: 'bg-[#F0FDFA]',
        borderColor: 'border-[#99F6E4]',
        textColor: 'text-[#0D9488]',
        badgeBg: 'bg-[#F0FDFA]',
        badgeText: 'text-[#0D9488]',
        label: 'Video',
      }
    case 'audio':
      return {
        icon: Music,
        bgColor: 'bg-[#FDF2F8]',
        borderColor: 'border-[#FBCFE8]',
        textColor: 'text-[#DB2777]',
        badgeBg: 'bg-[#FDF2F8]',
        badgeText: 'text-[#DB2777]',
        label: 'Audio',
      }
    case 'archive':
      return {
        icon: Archive,
        bgColor: 'bg-[#FEFCE8]',
        borderColor: 'border-[#FEF08A]',
        textColor: 'text-[#CA8A04]',
        badgeBg: 'bg-[#FEFCE8]',
        badgeText: 'text-[#CA8A04]',
        label: 'Archive',
      }
    case 'code':
      return {
        icon: Code2,
        bgColor: 'bg-[#F1F5F9]',
        borderColor: 'border-[#CBD5E1]',
        textColor: 'text-[#475569]',
        badgeBg: 'bg-[#F1F5F9]',
        badgeText: 'text-[#475569]',
        label: 'Code',
      }
    case 'other':
    default:
      return {
        icon: File,
        bgColor: 'bg-[#FAF5EC]',
        borderColor: 'border-[#E5DED1]',
        textColor: 'text-[#9C7D47]',
        badgeBg: 'bg-[#FAF5EC]',
        badgeText: 'text-[#9C7D47]',
        label: 'File',
      }
  }
}

export function getFileIconForFilename(filename: string, mimeType?: string): FileIconMeta {
  const format = detectFileFormat(filename, mimeType)
  const theme = getFileCategoryTheme(format.category)
  return {
    ...theme,
    label: format.label,
  }
}
