import { useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'

export function useSpeechInput(onTranscript: (text: string) => void, onError?: (msg: string) => void) {
  const [isListening, setIsListening] = useState(false)

  const startListening = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      const SpeechAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechAPI) { onError?.('Microphone is not available on this device.'); return }
      const r = new SpeechAPI()
      r.lang = navigator.language || 'en-GB'
      r.onresult = (e: any) => onTranscript(e.results[0][0].transcript)
      r.onerror = () => setIsListening(false)
      r.onend = () => setIsListening(false)
      setIsListening(true)
      r.start()
      return
    }

    try {
      const { available } = await SpeechRecognition.available()
      if (!available) { onError?.('Microphone is not available on this device.'); return }
      const perm = await SpeechRecognition.requestPermission()
      if (perm.speechRecognition !== 'granted') { onError?.('Microphone permission denied.'); return }
      setIsListening(true)

      // Use partialResults: true because the iOS plugin resolves the promise
      // on the first partial result when false, losing the full transcription.
      // Listen for partials and submit when speech stops.
      let lastTranscript = ''
      let silenceTimer: ReturnType<typeof setTimeout> | null = null

      const listener = await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        if (data.matches?.[0]) {
          lastTranscript = data.matches[0]
          if (silenceTimer) clearTimeout(silenceTimer)
          silenceTimer = setTimeout(async () => {
            listener.remove()
            setIsListening(false)
            await SpeechRecognition.stop()
            if (lastTranscript) onTranscript(lastTranscript)
          }, 1500)
        }
      })

      await SpeechRecognition.start({
        language: 'en-GB', maxResults: 1,
        partialResults: true, popup: false,
      })
    } catch {
      setIsListening(false)
    }
  }, [onTranscript, onError])

  const stopListening = useCallback(async () => {
    setIsListening(false)
    if (Capacitor.isNativePlatform()) await SpeechRecognition.stop()
  }, [])

  return { isListening, startListening, stopListening }
}
