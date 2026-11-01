'use client'

import React from 'react'
import { Volume2, VolumeX, Pause, Play, Square, Loader2, AlertCircle } from 'lucide-react'
import { PlaybackStatus } from '@/lib/audio/use-audio-player'

interface ReadAloudButtonProps {
  messageId: string
  content: string
  activeMessageId: string | null
  status: PlaybackStatus
  playerError: { messageId: string; error: string } | null
  onPlay: (messageId: string, text: string) => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onClearError: () => void
}

export function ReadAloudButton({
  messageId,
  content,
  activeMessageId,
  status,
  playerError,
  onPlay,
  onPause,
  onResume,
  onStop,
  onClearError,
}: ReadAloudButtonProps) {
  const isThisMessageActive = activeMessageId === messageId
  const isThisMessageError = playerError?.messageId === messageId
  const isPlaying = isThisMessageActive && status === 'playing'
  const isPaused = isThisMessageActive && status === 'paused'
  const isLoading = isThisMessageActive && status === 'loading'

  if (isThisMessageError) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-[#B91C1C] bg-[#FDF2F2] border border-[#F8D7DA] rounded-full px-2.5 py-0.5 max-w-fit">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        <span className="truncate max-w-[200px]" title={playerError.error}>
          {playerError.error}
        </span>
        <button
          onClick={() => {
            onClearError()
            onPlay(messageId, content)
          }}
          className="underline font-semibold hover:text-[#991B1B] ml-1 cursor-pointer"
        >
          Retry
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF5EC] text-[#9C7D47] border border-[#E5DED1]">
        <Loader2 className="h-3 w-3 animate-spin text-[#9C7D47]" />
        <span>Synthesizing voice...</span>
      </div>
    )
  }

  if (isPlaying) {
    return (
      <div className="inline-flex items-center gap-1 bg-[#FAF5EC] border border-[#E5DED1] rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#9C7D47] shadow-2xs">
        <span className="flex items-center gap-1 mr-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#9C7D47] animate-pulse" />
          <Volume2 className="h-3 w-3 text-[#9C7D47]" />
          <span>Speaking</span>
        </span>
        <button
          onClick={onPause}
          className="p-1 rounded-full hover:bg-[#F8F4EA] text-[#9C7D47] transition-colors cursor-pointer"
          title="Pause playback"
          aria-label="Pause playback"
        >
          <Pause className="h-3 w-3" />
        </button>
        <button
          onClick={onStop}
          className="p-1 rounded-full hover:bg-[#F8F4EA] text-[#9C7D47] transition-colors cursor-pointer"
          title="Stop playback"
          aria-label="Stop playback"
        >
          <Square className="h-3 w-3" />
        </button>
      </div>
    )
  }

  if (isPaused) {
    return (
      <div className="inline-flex items-center gap-1 bg-[#FEF8EC] border border-[#FDE68A] rounded-full px-2 py-0.5 text-[11px] font-medium text-[#B45309] shadow-2xs">
        <span className="flex items-center gap-1 mr-1">
          <VolumeX className="h-3 w-3 text-[#B45309]" />
          <span>Paused</span>
        </span>
        <button
          onClick={onResume}
          className="p-1 rounded-full hover:bg-[#FDE68A]/50 text-[#B45309] transition-colors cursor-pointer"
          title="Resume playback"
          aria-label="Resume playback"
        >
          <Play className="h-3 w-3" />
        </button>
        <button
          onClick={onStop}
          className="p-1 rounded-full hover:bg-[#FDE68A]/50 text-[#B45309] transition-colors cursor-pointer"
          title="Stop playback"
          aria-label="Stop playback"
        >
          <Square className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onPlay(messageId, content)}
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-[#777064] hover:text-[#9C7D47] hover:bg-[#FAF5EC] border border-transparent hover:border-[#E5DED1] transition-all cursor-pointer"
      title="Listen to this answer with Deepgram AI Voice"
      aria-label="Read answer aloud"
    >
      <Volume2 className="h-3 w-3" />
      <span>Read aloud</span>
    </button>
  )
}
