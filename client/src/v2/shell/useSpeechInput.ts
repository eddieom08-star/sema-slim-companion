import { useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'

export function useSpeechInput(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false)

  const startListening = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      const SpeechAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechAPI) return
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
      if (!available) return
      const perm = await SpeechRecognition.requestPermission()
      if (perm.speechRecognition !== 'granted') return
      setIsListening(true)
      await SpeechRecognition.start({
        language: 'en-GB', maxResults: 1,
        prompt: 'What did you eat, your weight, or how you feel',
        partialResults: false, popup: false,
      })
      SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        if (data.matches?.[0]) {
          onTranscript(data.matches[0])
          setIsListening(false)
          SpeechRecognition.stop()
        }
      })
    } catch {
      setIsListening(false)
    }
  }, [onTranscript])

  const stopListening = useCallback(async () => {
    setIsListening(false)
    if (Capacitor.isNativePlatform()) await SpeechRecognition.stop()
  }, [])

  return { isListening, startListening, stopListening }
}
