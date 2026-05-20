/**
 * Server-side TTS hook using Fay's Alibaba NLS TTS.
 * Provides higher quality Chinese voice compared to browser TTS.
 */
import { useRef, useCallback, useState } from 'react';
import { dhTTS } from '@/lib/api/digitalHumanV2';

export function useServerTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      const audioData = await dhTTS(text);
      const ctx = getAudioContext();

      // Stop any current playback
      if (currentSourceRef.current) {
        try { currentSourceRef.current.stop(); } catch {}
        currentSourceRef.current = null;
      }

      // Decode WAV/MP3 data
      const audioBuffer = await ctx.decodeAudioData(audioData.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      source.onended = () => {
        setIsSpeaking(false);
        currentSourceRef.current = null;
      };

      currentSourceRef.current = source;
      source.start(0);
      setIsSpeaking(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Server TTS error:', err);
      setIsSpeaking(false);
      setIsLoading(false);
    }
  }, [getAudioContext]);

  const cancel = useCallback(() => {
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch {}
      currentSourceRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  return { speak, cancel, isSpeaking, isLoading };
}
