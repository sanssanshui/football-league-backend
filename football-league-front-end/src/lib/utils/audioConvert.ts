/**
 * MP3-to-WAV converter with synchronous WAV PCM parsing for Live2D lip-sync.
 *
 * Key architecture:
 * - Uses a SHARED AudioContext (reused across sentences).
 * - Parses WAV PCM data synchronously after conversion.
 * - The LAppWavFileHandler reads PCM data synchronously each frame,
 *   so pre-parsing eliminates the async startup delay.
 */

// Shared AudioContext — browser limit is ~6, so reuse it.
let _sharedAudioCtx: AudioContext | null = null;
function getSharedAudioContext(): AudioContext {
  if (!_sharedAudioCtx) {
    _sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (_sharedAudioCtx.state === 'closed') {
    _sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _sharedAudioCtx;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export interface WavPcmData {
  /** PCM samples per channel (Float32Array for each channel) */
  channels: Float32Array[];
  /** Sample rate in Hz */
  sampleRate: number;
  /** Number of audio channels (1=mono, 2=stereo) */
  numChannels: number;
  /** Number of samples per channel */
  samplesPerChannel: number;
}

/**
 * Synchronously parse a WAV ArrayBuffer into PCM Float32Arrays.
 * This is fast (pure computation, no I/O) and runs synchronously
 * so the PCM data is available immediately for lip-sync.
 */
export function parseWavPcmSync(wavBuffer: ArrayBuffer): WavPcmData {
  const view = new DataView(wavBuffer);
  let offset = 0;

  // RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') {
    throw new Error('Not a valid WAV file (missing RIFF header)');
  }
  offset = 12;

  let numChannels = 1;
  let sampleRate = 16000;
  let bitsPerSample = 16;
  let dataOffset = 0;
  let dataSize = 0;

  // Find fmt and data chunks
  while (offset < view.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      const audioFormat = view.getUint16(offset + 8, true);
      if (audioFormat !== 1) {
        throw new Error(`WAV is not linear PCM (format=${audioFormat})`);
      }
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break; // data chunk found, stop parsing
    }

    offset += 8 + chunkSize;
  }

  if (dataSize === 0) {
    throw new Error('No data chunk found in WAV file');
  }

  const bytesPerSample = bitsPerSample / 8;
  const numSamples = dataSize / (numChannels * bytesPerSample);
  const channels: Float32Array[] = [];

  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(new Float32Array(numSamples));
  }

  // Read interleaved PCM samples
  const wavBytes = new Uint8Array(wavBuffer);
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const byteOffset = dataOffset + (i * numChannels + ch) * bytesPerSample;
      let sample: number;
      if (bitsPerSample === 16) {
        // Int16 LE
        sample = (wavBytes[byteOffset] | (wavBytes[byteOffset + 1] << 8));
        if (sample >= 0x8000) sample -= 0x10000;
        sample /= 32768.0;
      } else if (bitsPerSample === 8) {
        sample = (wavBytes[byteOffset] - 128) / 128.0;
      } else {
        sample = 0;
      }
      channels[ch][i] = sample;
    }
  }

  return {
    channels,
    sampleRate,
    numChannels,
    samplesPerChannel: numSamples,
  };
}

export async function convertMp3ArrayBufferToWavArrayBuffer(
  mp3ArrayBuffer: ArrayBuffer
): Promise<ArrayBuffer> {
  const audioContext = getSharedAudioContext();
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const audioBuffer = await audioContext.decodeAudioData(mp3ArrayBuffer.slice(0));

  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const channelData: Int16Array[] = [];

  for (let i = 0; i < numberOfChannels; i++) {
    const data = audioBuffer.getChannelData(i);
    const int16Data = new Int16Array(data.length);
    for (let j = 0; j < data.length; j++) {
      int16Data[j] = Math.round(Math.max(-1, Math.min(1, data[j])) * 32767);
    }
    channelData.push(int16Data);
  }

  const samplesPerChannel = channelData[0].length;
  const dataSize = samplesPerChannel * 2 * numberOfChannels;
  const headerSize = 44;
  const wavBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(wavBuffer);
  const wavBytes = new Uint8Array(wavBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2 * numberOfChannels, true);
  view.setUint16(32, 2 * numberOfChannels, true);
  view.setUint16(34, 16, true);
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = headerSize;
  for (let i = 0; i < samplesPerChannel; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const sample = channelData[ch][i];
      wavBytes[offset++] = sample & 0xFF;
      wavBytes[offset++] = (sample >> 8) & 0xFF;
    }
  }

  return wavBuffer;
}

/** Convert audio and parse PCM — single call for both playback + lip-sync data */
export async function convertMp3AndParsePcm(
  mp3ArrayBuffer: ArrayBuffer
): Promise<{ wavBuffer: ArrayBuffer; pcm: WavPcmData }> {
  const wavBuffer = await convertMp3ArrayBufferToWavArrayBuffer(mp3ArrayBuffer);
  const pcm = parseWavPcmSync(wavBuffer);
  return { wavBuffer, pcm };
}
