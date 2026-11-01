'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface AudioRecorderState {
  isRecording: boolean
  isTranscribing: boolean
  recordingDuration: number
  error: string | null
}

const MAX_RECORDING_SECONDS = 120 // 2 minutes max limit

export function useAudioRecorder(onTranscript: (transcript: string) => void) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const shouldTranscribeRef = useRef<boolean>(true)

  const cleanupTracksAndTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {}
      })
      mediaStreamRef.current = null
    }

    mediaRecorderRef.current = null
    setRecordingDuration(0)
    setIsRecording(false)
  }, [])

  const cancelRecording = useCallback(() => {
    shouldTranscribeRef.current = false
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {}
    }
    audioChunksRef.current = []
    cleanupTracksAndTimer()
    setError(null)
  }, [cleanupTracksAndTimer])

  const stopAndTranscribe = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return
    }

    shouldTranscribeRef.current = true
    try {
      mediaRecorderRef.current.stop()
    } catch (err: unknown) {
      console.error('[useAudioRecorder] Stop error:', err)
      cancelRecording()
    }
  }, [cancelRecording])

  const startRecording = useCallback(async () => {
    setError(null)

    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Voice recording is not supported in this browser. Please use a modern browser such as Chrome, Edge, or Firefox.')
      return
    }

    if (typeof window.MediaRecorder === 'undefined') {
      setError('MediaRecorder API is not supported in this browser.')
      return
    }

    try {
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav'
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      mediaStreamRef.current = stream
      audioChunksRef.current = []
      shouldTranscribeRef.current = true

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const streamToClean = mediaStreamRef.current
        if (streamToClean) {
          streamToClean.getTracks().forEach((t) => t.stop())
          mediaStreamRef.current = null
        }

        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        setIsRecording(false)
        setRecordingDuration(0)

        if (!shouldTranscribeRef.current) {
          audioChunksRef.current = []
          return
        }

        const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType })
        audioChunksRef.current = []

        if (recordedBlob.size < 100) {
          setError('Recording was empty. Please hold the mic button or speak clearly into your microphone.')
          return
        }

        setIsTranscribing(true)
        setError(null)

        try {
          const formData = new FormData()
          formData.append('file', recordedBlob, 'question-audio.webm')
          formData.append('mimeType', mimeType)

          const response = await fetch('/api/audio/transcribe', {
            method: 'POST',
            body: formData,
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Failed to transcribe audio recording.')
          }

          if (data.transcript && data.transcript.trim()) {
            onTranscript(data.transcript.trim())
          } else {
            setError('No speech was detected in your recording. Please try speaking again.')
          }
        } catch (transcribeErr: unknown) {
          console.error('[useAudioRecorder] Transcription error:', transcribeErr)
          setError(
            transcribeErr instanceof Error
              ? transcribeErr.message
              : 'Voice transcription failed. Please check your network and try again.'
          )
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.start(250)
      setIsRecording(true)
      setRecordingDuration(0)

      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setRecordingDuration(elapsed)

        if (elapsed >= MAX_RECORDING_SECONDS) {
          stopAndTranscribe()
        }
      }, 500)
    } catch (err: unknown) {
      console.error('[useAudioRecorder] Mic access error:', err)
      cleanupTracksAndTimer()

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Microphone access was denied. Please allow microphone permissions in your browser settings to use voice input.')
          return
        }
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No microphone found on your device. Please plug in a microphone or headset.')
          return
        }
      }

      setError('Could not access microphone. Please check your audio settings.')
    }
  }, [cleanupTracksAndTimer, onTranscript, stopAndTranscribe])

  useEffect(() => {
    return () => {
      cleanupTracksAndTimer()
    }
  }, [cleanupTracksAndTimer])

  return {
    isRecording,
    isTranscribing,
    recordingDuration,
    maxDuration: MAX_RECORDING_SECONDS,
    error,
    startRecording,
    stopAndTranscribe,
    cancelRecording,
    clearError: () => setError(null),
  }
}
