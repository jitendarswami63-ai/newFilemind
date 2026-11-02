'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused'

export function useAudioPlayer() {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
  const [status, setStatus] = useState<PlaybackStatus>('idle')
  const [playerError, setPlayerError] = useState<{ messageId: string; error: string } | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map())

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current.removeAttribute('src')
        audioRef.current.load()
      } catch {}
      audioRef.current = null
    }
    setStatus('idle')
    setActiveMessageId(null)
  }, [])

  const pauseAudio = useCallback(() => {
    if (audioRef.current && status === 'playing') {
      try {
        audioRef.current.pause()
      } catch {}
      setStatus('paused')
    }
  }, [status])

  const resumeAudio = useCallback(() => {
    if (audioRef.current && status === 'paused') {
      audioRef.current.play().then(() => {
        setStatus('playing')
      }).catch((err) => {
        console.warn('[useAudioPlayer] Resume playback error:', err)
        stopAudio()
      })
    }
  }, [status, stopAudio])

  const playMessageSpeech = useCallback(
    async (messageId: string, text: string) => {
      setPlayerError(null)

      if (activeMessageId === messageId) {
        if (status === 'playing') {
          pauseAudio()
          return
        }
        if (status === 'paused') {
          resumeAudio()
          return
        }
      }

      stopAudio()

      setActiveMessageId(messageId)
      setStatus('loading')

      try {
        let objectUrl = audioUrlCacheRef.current.get(messageId)

        if (!objectUrl) {
          const res = await fetch('/api/audio/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          })

          if (!res.ok) {
            let errorMsg = 'Deepgram voice service is temporarily unavailable.'
            try {
              const data = await res.json()
              if (data.error) errorMsg = data.error
            } catch {}

            // Native Browser SpeechSynthesis fallback
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              try {
                window.speechSynthesis.cancel()
                const utterance = new SpeechSynthesisUtterance(text.slice(0, 1500))
                utterance.rate = 1.0
                utterance.pitch = 1.0
                utterance.onend = () => {
                  setStatus('idle')
                  setActiveMessageId(null)
                }
                utterance.onerror = () => {
                  setStatus('idle')
                  setActiveMessageId(null)
                }
                window.speechSynthesis.speak(utterance)
                setStatus('playing')
                return
              } catch (synthErr) {
                console.warn('[useAudioPlayer] SpeechSynthesis fallback failed:', synthErr)
              }
            }

            throw new Error(errorMsg)
          }

          const arrayBuf = await res.arrayBuffer()
          const blob = new Blob([arrayBuf], { type: 'audio/mpeg' })
          objectUrl = URL.createObjectURL(blob)
          audioUrlCacheRef.current.set(messageId, objectUrl)
        }

        if (audioRef.current) {
          try {
            audioRef.current.pause()
            audioRef.current.removeAttribute('src')
            audioRef.current.load()
          } catch {}
          audioRef.current = null
        }

        const audio = new Audio(objectUrl)
        audioRef.current = audio

        audio.onended = () => {
          setStatus('idle')
          setActiveMessageId(null)
        }

        audio.onerror = () => {
          const detail = audio.error
            ? ` (Code ${audio.error.code}: ${audio.error.message || 'Decoder failure'})`
            : ''
          console.warn('[useAudioPlayer] Audio playback error:', detail)
          setPlayerError({
            messageId,
            error: 'Failed to play audio in browser.' + detail,
          })
          stopAudio()
        }

        await audio.play()
        setStatus('playing')
      } catch (err: unknown) {
        console.warn('[useAudioPlayer] Speech synthesis notice:', err)
        const errMsg = err instanceof Error ? err.message : 'Speech synthesis failed.'
        setPlayerError({ messageId, error: errMsg })
        stopAudio()
      }
    },
    [activeMessageId, status, pauseAudio, resumeAudio, stopAudio]
  )

  useEffect(() => {
    const cache = audioUrlCacheRef.current
    return () => {
      stopAudio()
      cache.forEach((url) => {
        try {
          URL.revokeObjectURL(url)
        } catch {}
      })
      cache.clear()
    }
  }, [stopAudio])

  return {
    activeMessageId,
    status,
    playerError,
    playMessageSpeech,
    pauseAudio,
    resumeAudio,
    stopAudio,
    clearError: () => setPlayerError(null),
  }
}
