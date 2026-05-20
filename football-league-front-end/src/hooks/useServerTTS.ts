/**
 * Server-side TTS hook with Live2D lip-sync support.
 * Push audio to Live2dManager queue so the character's mouth animates in sync.
 */
import { useRef, useCallback, useState } from 'react';
import { dhTTS } from '@/lib/api/digitalHumanV2';

// Regex for Chinese/English sentence boundaries
const SENTENCE_PUNC = /[；;！!？?。]\s*/g;

export function splitTextToSentences(text: string): string[] {
  const sentences: string[] = [];
  let lastEnd = 0;
  let match: RegExpExecArray | null;

  const re = new RegExp(SENTENCE_PUNC.source, 'g');
  while ((match = re.exec(text)) !== null) {
    const end = match.index + match[0].length;
    const sentence = text.slice(lastEnd, end).trim();
    if (sentence.length > 1) sentences.push(sentence);
    lastEnd = end;
  }
  const remainder = text.slice(lastEnd).trim();
  if (remainder.length > 0) sentences.push(remainder);

  return sentences;
}

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

  /** Direct play (no Live2D lip-sync) — used by FootballAiChat */
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsLoading(true);
    try {
      const audioData = await dhTTS(text);
      const ctx = getAudioContext();

      if (currentSourceRef.current) {
        try { currentSourceRef.current.stop(); } catch {}
        currentSourceRef.current = null;
      }

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

  /**
   * Speak text with Live2D lip-sync.
   * Splits text into sentences, calls TTS for each, and pushes WAV audio
   * to the Live2dManager queue so the character's mouth animates in sync.
   */
  const speakWithLipSync = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsLoading(true);
    setIsSpeaking(true);

    const sentences = splitTextToSentences(text);

    try {
      // Dynamically import Live2dManager and audio utilities
      const { Live2dManager } = await import('@/lib/live2d/live2dManager');
      const { convertMp3AndParsePcm, parseWavPcmSync } = await import('@/lib/utils/audioConvert');

      for (const sentence of sentences) {
        try {
          const audioData = await dhTTS(sentence);

          // Convert MP3 to WAV AND pre-parse PCM data for sync lip-sync
          try {
            const { wavBuffer, pcm } = await convertMp3AndParsePcm(audioData);
            Live2dManager.getInstance().pushAudioQueue(wavBuffer, pcm);
          } catch {
            // If MP3→WAV fails, try parsing as raw WAV
            try {
              const pcm = parseWavPcmSync(audioData);
              Live2dManager.getInstance().pushAudioQueue(audioData, pcm);
            } catch {
              // Last resort: push without PCM (legacy async fallback)
              Live2dManager.getInstance().pushAudioQueue(audioData);
            }
          }
        } catch (err) {
          console.error('TTS sentence error:', err);
        }
      }
    } catch (err) {
      console.error('Lip-sync TTS error:', err);
    } finally {
      setIsLoading(false);
      // isSpeaking will be set to false when audio queue is done
      // Watch Live2dManager.isAudioPlaying() in a loop
      const checkDone = () => {
        import('@/lib/live2d/live2dManager').then(({ Live2dManager }) => {
          if (Live2dManager.getInstance().isAudioPlaying()) {
            setTimeout(checkDone, 200);
          } else {
            setIsSpeaking(false);
          }
        }).catch(() => { setIsSpeaking(false); });
      };
      setTimeout(checkDone, 300);
    }
  }, []);

  const cancel = useCallback(async () => {
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch {}
      currentSourceRef.current = null;
    }
    // Also stop Live2D audio playback
    try {
      const { Live2dManager } = await import('@/lib/live2d/live2dManager');
      Live2dManager.getInstance().stopAudio();
    } catch {}
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  return { speak, speakWithLipSync, cancel, isSpeaking, isLoading };
}
