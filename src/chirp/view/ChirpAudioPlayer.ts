/**
 * ChirpAudioPlayer.ts
 *
 * One-shot Web Audio playback of the model chirp (or event whitened strain),
 * pitched up one octave by declaring a 2× sample rate. Lazily uses tambo's
 * AudioContext via SoundGenerator so the sim sound toggle is respected.
 */
import type { Node } from "scenerystack/scenery";
import { SoundGenerator, soundManager } from "scenerystack/tambo";
import type { DetectorStrain } from "../../common/data/dataTypes.js";
import { CHIRP_AUDIO_FADE_S, CHIRP_AUDIO_PITCH_FACTOR, CHIRP_SAMPLE_RATE } from "../../GravitationalWavesConstants.js";
import type { ChirpModel } from "../model/ChirpModel.js";

export class ChirpAudioPlayer extends SoundGenerator {
  private readonly model: ChirpModel;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;

  public constructor(model: ChirpModel, associatedViewNode: Node) {
    super({ initialOutputLevel: 0.7, associatedViewNode });
    this.model = model;
    soundManager.addSoundGenerator(this);
  }

  /** Play the current source once (gesture-safe: call from a button listener). */
  public playChirp(): void {
    if (!this.fullyEnabledProperty.value) {
      return;
    }
    this.stop();

    const samples = this.samplesForPlayback();
    if (samples.length < 2) {
      return;
    }

    const pitchedRate = CHIRP_SAMPLE_RATE * CHIRP_AUDIO_PITCH_FACTOR;
    const buffer = this.audioContext.createBuffer(1, samples.length, pitchedRate);
    const channel = buffer.getChannelData(0);
    let peak = 0;
    for (const sample of samples) {
      peak = Math.max(peak, Math.abs(sample));
    }
    const norm = peak > 0 ? 0.9 / peak : 1;
    for (let i = 0; i < samples.length; i++) {
      channel[i] = (samples[i] ?? 0) * norm;
    }

    const fade = Math.min(CHIRP_AUDIO_FADE_S, buffer.duration / 4);
    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + fade);
    gain.gain.setValueAtTime(1, now + Math.max(fade, buffer.duration - fade));
    gain.gain.linearRampToValueAtTime(0, now + buffer.duration);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.soundSourceDestination);
    source.onended = () => {
      if (this.source === source) {
        this.source = null;
        this.gain = null;
      }
      source.disconnect();
      gain.disconnect();
    };
    source.start(now);
    this.source = source;
    this.gain = gain;
  }

  public stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // already stopped
      }
      this.source.disconnect();
      this.source = null;
    }
    if (this.gain) {
      this.gain.disconnect();
      this.gain = null;
    }
  }

  public override dispose(): void {
    this.stop();
    soundManager.removeSoundGenerator(this);
    super.dispose();
  }

  private samplesForPlayback(): Float64Array {
    const event = this.model.loadedEventProperty.value;
    if (this.model.sourceProperty.value !== "custom" && event) {
      return decodeStrain(event.H1);
    }
    return this.model.whitenedSignalProperty.value;
  }
}

function decodeStrain(strain: DetectorStrain): Float64Array {
  const out = new Float64Array(strain.samples.length);
  for (let i = 0; i < strain.samples.length; i++) {
    out[i] = (strain.samples[i] ?? 0) * strain.scale;
  }
  return out;
}
