export interface TimedPhoneme {
  phoneme: string;
  start: number; // in seconds
  end: number; // in seconds
}

export const PHONEME_TO_VISEME: Record<string, string> = {
  sil: 'viseme_sil',
  PP: 'viseme_PP',
  FF: 'viseme_FF',
  TH: 'viseme_TH',
  DD: 'viseme_DD',
  kk: 'viseme_kk',
  CH: 'viseme_CH',
  SS: 'viseme_SS',
  nn: 'viseme_nn',
  RR: 'viseme_RR',
  aa: 'viseme_aa',
  E: 'viseme_E',
  ih: 'viseme_I',
  oh: 'viseme_O',
  ou: 'viseme_U',
  AH: 'viseme_aa',
  EH: 'viseme_E',
  IH: 'viseme_I',
  OH: 'viseme_O',
  OW: 'viseme_O',
  UH: 'viseme_U',
  UW: 'viseme_U',
  EE: 'viseme_E',
  AA: 'viseme_aa',
  AE: 'viseme_aa',
  AO: 'viseme_O',
  AW: 'viseme_O',
  AY: 'viseme_aa',
  B: 'viseme_PP',
  CH_alt: 'viseme_CH',
  D: 'viseme_DD',
  DH: 'viseme_TH',
  ER: 'viseme_RR',
  EY: 'viseme_E',
  F: 'viseme_FF',
  G: 'viseme_kk',
  HH: 'viseme_sil',
  IY: 'viseme_I',
  JH: 'viseme_CH',
  K: 'viseme_kk',
  L: 'viseme_nn',
  M: 'viseme_PP',
  N: 'viseme_nn',
  NG: 'viseme_nn',
  OY: 'viseme_O',
  P: 'viseme_PP',
  R: 'viseme_RR',
  S: 'viseme_SS',
  SH: 'viseme_CH',
  T: 'viseme_DD',
  V: 'viseme_FF',
  W: 'viseme_U',
  Y: 'viseme_I',
  Z: 'viseme_SS',
  ZH: 'viseme_CH',
};

// Realistic DS&A sentence phoneme stream for testing
export const DEMO_PHONEME_SEQUENCE: TimedPhoneme[] = [
  // "Let"
  { phoneme: 'L', start: 0.0, end: 0.08 },
  { phoneme: 'EH', start: 0.08, end: 0.18 },
  { phoneme: 'T', start: 0.18, end: 0.25 },
  // "us"
  { phoneme: 'AH', start: 0.28, end: 0.38 },
  { phoneme: 'S', start: 0.38, end: 0.48 },
  // "analyze"
  { phoneme: 'AE', start: 0.52, end: 0.62 },
  { phoneme: 'N', start: 0.62, end: 0.7 },
  { phoneme: 'AH', start: 0.7, end: 0.78 },
  { phoneme: 'L', start: 0.78, end: 0.86 },
  { phoneme: 'AY', start: 0.86, end: 1.0 },
  { phoneme: 'Z', start: 1.0, end: 1.1 },
  // "the"
  { phoneme: 'DH', start: 1.15, end: 1.22 },
  { phoneme: 'AH', start: 1.22, end: 1.3 },
  // "algorithm"
  { phoneme: 'AE', start: 1.35, end: 1.45 },
  { phoneme: 'L', start: 1.45, end: 1.53 },
  { phoneme: 'G', start: 1.53, end: 1.62 },
  { phoneme: 'ER', start: 1.62, end: 1.72 },
  { phoneme: 'IH', start: 1.72, end: 1.82 },
  { phoneme: 'DH', start: 1.82, end: 1.9 },
  { phoneme: 'M', start: 1.9, end: 2.02 },
  // "time complexity"
  { phoneme: 'T', start: 2.1, end: 2.18 },
  { phoneme: 'AY', start: 2.18, end: 2.32 },
  { phoneme: 'M', start: 2.32, end: 2.42 },
  { phoneme: 'K', start: 2.48, end: 2.56 },
  { phoneme: 'AA', start: 2.56, end: 2.66 },
  { phoneme: 'M', start: 2.66, end: 2.76 },
  { phoneme: 'P', start: 2.76, end: 2.84 },
  { phoneme: 'L', start: 2.84, end: 2.92 },
  { phoneme: 'EH', start: 2.92, end: 3.02 },
  { phoneme: 'K', start: 3.02, end: 3.12 },
  { phoneme: 'S', start: 3.12, end: 3.22 },
  { phoneme: 'IH', start: 3.22, end: 3.32 },
  { phoneme: 'T', start: 3.32, end: 3.4 },
  { phoneme: 'IY', start: 3.4, end: 3.55 },
];

/**
 * Converts speech text into a stream of timed viseme/phoneme markers.
 * Calibrated for standard conversational TTS tempo (~150 wpm).
 */
export function generatePhonemesFromText(text: string, speechRate = 1.05): TimedPhoneme[] {
  const result: TimedPhoneme[] = [];
  let currentTime = 0.02;
  const words = text.trim().split(/\s+/);

  for (let w = 0; w < words.length; w++) {
    const rawWord = words[w];
    const cleanWord = rawWord.toLowerCase().replace(/[^a-z]/g, '');
    const isPunctuation = /[.,!?;:]$/.test(rawWord);

    if (!cleanWord) {
      if (isPunctuation) currentTime += 0.1 / speechRate;
      continue;
    }

    let i = 0;
    while (i < cleanWord.length) {
      let phoneme = 'AH';
      let duration = 0.05 / speechRate;

      if (i + 1 < cleanWord.length) {
        const pair = cleanWord.substring(i, i + 2);
        if (pair === 'th') {
          phoneme = 'TH';
          duration = 0.045 / speechRate;
          i += 2;
        } else if (pair === 'sh' || pair === 'ch') {
          phoneme = 'CH';
          duration = 0.05 / speechRate;
          i += 2;
        } else if (pair === 'ee' || pair === 'ea') {
          phoneme = 'EE';
          duration = 0.065 / speechRate;
          i += 2;
        } else if (pair === 'oo' || pair === 'ou') {
          phoneme = 'UW';
          duration = 0.065 / speechRate;
          i += 2;
        } else {
          const ch = cleanWord[i];
          if (ch === 'a') phoneme = 'AA';
          else if (ch === 'e') phoneme = 'EH';
          else if (ch === 'i') phoneme = 'IH';
          else if (ch === 'o') phoneme = 'OH';
          else if (ch === 'u') phoneme = 'UH';
          else if (ch === 'p' || ch === 'b' || ch === 'm') phoneme = 'PP';
          else if (ch === 'f' || ch === 'v') phoneme = 'FF';
          else if (ch === 't' || ch === 'd') phoneme = 'T';
          else if (ch === 's' || ch === 'z') phoneme = 'S';
          else if (ch === 'k' || ch === 'c' || ch === 'g') phoneme = 'K';
          else phoneme = 'AH';

          duration = 'aeiou'.includes(ch) ? 0.06 / speechRate : 0.045 / speechRate;
          i += 1;
        }
      } else {
        const ch = cleanWord[i];
        if (ch === 'a') phoneme = 'AA';
        else if (ch === 'e') phoneme = 'EH';
        else if (ch === 'i') phoneme = 'IH';
        else if (ch === 'o') phoneme = 'OH';
        else if (ch === 'u') phoneme = 'UH';
        else if (ch === 'p' || ch === 'b' || ch === 'm') phoneme = 'PP';
        else if (ch === 'f' || ch === 'v') phoneme = 'FF';
        else phoneme = 'AH';

        duration = 'aeiou'.includes(ch) ? 0.06 / speechRate : 0.045 / speechRate;
        i += 1;
      }

      result.push({
        phoneme,
        start: currentTime,
        end: currentTime + duration,
      });
      currentTime += duration;
    }

    currentTime += isPunctuation ? 0.1 / speechRate : 0.03 / speechRate;
  }

  return result;
}

export class LipSyncController {
  private phonemeTimeline: TimedPhoneme[] = [];
  private playbackStartTime: number | null = null;
  private isPlaying = false;
  private currentVisemeWeights: Map<string, number> = new Map();
  private audioReactiveLevel = 0; // 0.0 to 1.0

  // Viseme driven live from SpeechSynthesis boundary events
  private liveViseme: string | null = null;
  private liveVisemeSetAt = 0;
  private readonly LIVE_VISEME_HOLD_MS = 120; // how long each boundary-event viseme is held

  /**
   * Called directly from utterance.onboundary with the word being spoken.
   * Converts the word's leading phoneme into a viseme and holds it for LIVE_VISEME_HOLD_MS.
   */
  public setActiveVisemeFromWord(word: string, currentTimeSec: number) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return;

    let phoneme = 'AH';
    const first2 = clean.substring(0, 2);
    if (first2 === 'th') phoneme = 'TH';
    else if (first2 === 'sh' || first2 === 'ch') phoneme = 'CH';
    else if (first2 === 'wh') phoneme = 'UH';
    else {
      const c = clean[0];
      if (c === 'a') phoneme = 'AA';
      else if (c === 'e') phoneme = 'EH';
      else if (c === 'i') phoneme = 'IH';
      else if (c === 'o') phoneme = 'OH';
      else if (c === 'u') phoneme = 'UH';
      else if (c === 'p' || c === 'b' || c === 'm') phoneme = 'PP';
      else if (c === 'f' || c === 'v') phoneme = 'FF';
      else if (c === 'r') phoneme = 'RR';
      else if (c === 'n' || c === 'l') phoneme = 'nn';
      else if (c === 's' || c === 'z') phoneme = 'SS';
      else if (c === 'k' || c === 'c' || c === 'g' || c === 'q') phoneme = 'kk';
      else if (c === 'd' || c === 't') phoneme = 'DD';
      else phoneme = 'AH';
    }

    this.liveViseme = PHONEME_TO_VISEME[phoneme] || 'viseme_aa';
    this.liveVisemeSetAt = currentTimeSec;
  }

  public clearLiveViseme() {
    this.liveViseme = null;
  }

  public playTimeline(phonemes: TimedPhoneme[], startTimeSec: number) {
    this.phonemeTimeline = phonemes;
    this.playbackStartTime = startTimeSec;
    this.isPlaying = true;
  }

  public playDemo(startTimeSec: number) {
    this.playTimeline(DEMO_PHONEME_SEQUENCE, startTimeSec);
  }

  public stop() {
    this.isPlaying = false;
    this.playbackStartTime = null;
    this.liveViseme = null;
    this.currentVisemeWeights.clear();
  }

  public syncToTime(elapsedSec: number, currentTimeSec: number) {
    if (this.isPlaying) {
      this.playbackStartTime = currentTimeSec - elapsedSec;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setAudioLevel(level: number) {
    this.audioReactiveLevel = Math.max(0, Math.min(1, level));
  }

  public update(deltaTime: number, currentTimeSec: number): Map<string, number> {
    const targetWeights = new Map<string, number>();

    // Priority 1: Live boundary-event driven viseme (perfectly synced to actual audio)
    if (this.liveViseme) {
      const ageMs = (currentTimeSec - this.liveVisemeSetAt) * 1000;
      if (ageMs < this.LIVE_VISEME_HOLD_MS) {
        // Smooth bell curve: ramp up, peak at 55ms, fade out
        const t = ageMs / this.LIVE_VISEME_HOLD_MS;
        const weight = Math.sin(t * Math.PI) * 0.6;
        targetWeights.set(this.liveViseme, Math.max(0, weight));
      } else {
        this.liveViseme = null;
      }
    }

    // Priority 2: Pre-generated phoneme timeline (fallback when boundary events not firing)
    if (!this.liveViseme && this.isPlaying && this.playbackStartTime !== null) {
      const elapsed = currentTimeSec - this.playbackStartTime;
      const lastPhoneme = this.phonemeTimeline[this.phonemeTimeline.length - 1];

      if (lastPhoneme && elapsed > lastPhoneme.end + 0.1) {
        this.stop();
      } else {
        const active = this.phonemeTimeline.find((p) => elapsed >= p.start && elapsed <= p.end);
        if (active) {
          const viseme = PHONEME_TO_VISEME[active.phoneme] || 'viseme_aa';
          const phonemeDuration = active.end - active.start;
          const phonemeProgress = (elapsed - active.start) / Math.max(0.01, phonemeDuration);
          const weight = Math.sin(phonemeProgress * Math.PI) * 0.55;
          targetWeights.set(viseme, Math.max(0, weight));
        }
      }
    }

    // Audio reactivity fallback when audio reactive level is present
    if (this.audioReactiveLevel > 0.05 && !this.isPlaying) {
      const openWeight = Math.min(0.35, this.audioReactiveLevel * 0.5);
      targetWeights.set('viseme_aa', openWeight * 0.35);
      targetWeights.set('viseme_O', openWeight * 0.2);
      targetWeights.set('mouthOpen', openWeight * 0.2);
    }

    // Smooth lerp for all active visemes to prevent harsh snapping
    const lerpRate = Math.min(1.0, deltaTime * 24.0); // fast responsive mouth transitions

    // Decay existing weights not targeted
    this.currentVisemeWeights.forEach((val, key) => {
      const target = targetWeights.get(key) || 0;
      const nextVal = val + (target - val) * lerpRate;
      if (nextVal < 0.01) {
        this.currentVisemeWeights.delete(key);
      } else {
        this.currentVisemeWeights.set(key, nextVal);
      }
    });

    // Rise new target weights
    targetWeights.forEach((target, key) => {
      const current = this.currentVisemeWeights.get(key) || 0;
      const nextVal = current + (target - current) * lerpRate;
      this.currentVisemeWeights.set(key, nextVal);
    });

    return this.currentVisemeWeights;
  }
}
