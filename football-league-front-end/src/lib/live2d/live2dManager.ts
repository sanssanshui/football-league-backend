import { LAppDelegate } from '@/lib/live2d/src/lappdelegate';
import { ResourceModel } from '@/lib/protocol';
import { type WavPcmData } from '@/lib/utils/audioConvert';

interface AudioQueueItem {
  wavBuffer: ArrayBuffer;
  pcm: WavPcmData | null;
}

export class Live2dManager {
    // 单例
    public static getInstance(): Live2dManager {
        if (! this._instance) {
            this._instance = new Live2dManager();
        }
        return this._instance;
    }

    public setReady(ready: boolean) {
      this._ready = ready;
    }

    public isReady(): boolean {
      return this._ready;
    }

    public changeCharacter(character: ResourceModel | null) {
      this._ready = false;
      LAppDelegate.getInstance().changeCharacter(character)
    }

    public setLipFactor(weight: number): void {
      this._lipFactor = weight;
    }

    public getLipFactor(): number {
      return this._lipFactor;
    }

    /** Push audio with optional pre-parsed PCM data for lip-sync */
    public pushAudioQueue(audioData: ArrayBuffer, pcm?: WavPcmData | null): void {
      this._ttsQueue.push({ wavBuffer: audioData, pcm: pcm || null });
    }

    public popAudioQueue(): AudioQueueItem | null {
      if (this._ttsQueue.length > 0) {
        return this._ttsQueue.shift()!;
      }
      return null;
    }

    public clearAudioQueue(): void {
      this._ttsQueue = [];
    }

    /** Play audio and return both WAV buffer and pre-parsed PCM */
    public playAudio(): { wavBuffer: ArrayBuffer; pcm: WavPcmData | null } | null {
      if (this._audioIsPlaying) return null;
      const item = this.popAudioQueue();
      if (item == null) return null;

      this._audioIsPlaying = true;

      const playAudioBuffer = (buffer: AudioBuffer) => {
        var source = this._audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this._audioContext.destination);
        source.onended = () => {
          this._audioIsPlaying = false;
        };
        source.start();
        this._audioSource = source;
      };

      const newAudioData = item.wavBuffer.slice(0);
      this._audioContext.decodeAudioData(newAudioData).then(
        buffer => playAudioBuffer(buffer)
      );

      return { wavBuffer: item.wavBuffer, pcm: item.pcm };
    }

    public stopAudio(): void {
      this.clearAudioQueue();
      if (this._audioSource) {
        this._audioSource.stop();
        this._audioSource = null;
      }
      this._audioIsPlaying = false;
    }

    public isAudioPlaying(): boolean {
      return this._audioIsPlaying;
    }

    // === Expression & Motion Control ===

    /** Set an expression by name on the current character */
    public setExpression(name: string): void {
      try {
        const sub = LAppDelegate.getInstance().getSubdelegate();
        if (sub && sub.getSize() > 0) {
          sub.at(0).getLive2DManager().setExpression(name);
        }
      } catch {}
    }

    /** Set a random expression from the character's available expressions */
    public setRandomExpression(): void {
      try {
        const sub = LAppDelegate.getInstance().getSubdelegate();
        if (sub && sub.getSize() > 0) {
          sub.at(0).getLive2DManager().setRandomExpression();
        }
      } catch {}
    }

    /** Start a specific motion by group name + index number + priority */
    public startMotion(group: string, no: number, priority: number): void {
      try {
        const sub = LAppDelegate.getInstance().getSubdelegate();
        if (sub && sub.getSize() > 0) {
          sub.at(0).getLive2DManager().startMotion(group, no, priority);
        }
      } catch {}
    }

    /** Start a random motion from the given group */
    public startRandomMotion(group: string, priority: number): void {
      try {
        const sub = LAppDelegate.getInstance().getSubdelegate();
        if (sub && sub.getSize() > 0) {
          sub.at(0).getLive2DManager().startRandomMotion(group, priority);
        }
      } catch {}
    }

    constructor() {
      this._audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this._audioIsPlaying = false;
      this._audioSource = null;
      this._lipFactor = 5.0;
      this._ready = false;
    }

    private static _instance: Live2dManager;
    private _ttsQueue: AudioQueueItem[] = [];
    private _audioContext: AudioContext;
    private _audioIsPlaying: boolean;
    private _audioSource: AudioBufferSourceNode | null;
    private _lipFactor: number;
    private _ready: boolean;
  }