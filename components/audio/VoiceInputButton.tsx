'use client'

import React from 'react'
import { Mic, Square, X, Loader2, AlertCircle } from 'lucide-react'

interface VoiceInputButtonProps {
  isRecording: boolean
  isTranscribing: boolean
  recordingDuration: number
  maxDuration: number
  error: string | null
  disabled?: boolean
  onStart: () => void
  onStop: () => void
  onCancel: () => void
  onClearError: () => void
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function VoiceInputButton({
  isRecording,
  isTranscribing,
  recordingDuration,
  maxDuration,
  error,
  disabled = false,
  onStart,
  onStop,
  onCancel,
  onClearError,
}: VoiceInputButtonProps) {
  if (isTranscribing) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#9C7D47] shadow-2xs">
        <Loader2 className="h-4 w-4 animate-spin text-[#9C7D47]" />
        <span className="hidden sm:inline">Transcribing voice...</span>
        <span className="sm:hidden">Listening...</span>
      </div>
    )
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] shadow-2xs animate-in fade-in duration-150">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
          </span>
          <span className="text-xs font-mono font-semibold text-[#B91C1C]">
            {formatDuration(recordingDuration)} / {formatDuration(maxDuration)}
          </span>
        </div>

        <button
          type="button"
          onClick={onStop}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg transition-colors cursor-pointer shadow-xs active:scale-95"
          title="Done speaking, transcribe audio"
        >
          <Square className="h-3 w-3 fill-current" />
          <span>Done</span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded text-[#B91C1C] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
          title="Cancel recording"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className="h-10 sm:h-11 px-3 rounded-xl border border-[#E5DED1] bg-[#FFFCF5] hover:bg-[#FAF5EC] hover:border-[#C5A878] text-[#777064] hover:text-[#9C7D47] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
        title="Speak question using Deepgram Nova-2"
        aria-label="Voice input"
      >
        <Mic className="h-4 w-4" />
        <span className="text-xs font-semibold hidden md:inline">Voice</span>
      </button>

      {error && (
        <div className="flex items-center gap-1 text-[11px] text-[#B91C1C] bg-[#FDF2F2] border border-[#F8D7DA] rounded-xl px-2 py-1 max-w-[200px]">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span className="truncate" title={error}>
            {error}
          </span>
          <button
            type="button"
            onClick={onClearError}
            className="text-rose-500 hover:text-rose-800 p-0.5 ml-0.5 cursor-pointer"
            aria-label="Clear error"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  )
}
