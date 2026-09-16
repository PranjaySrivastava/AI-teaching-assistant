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

// Realistic DS&A sentence phoneme stream with natural coarticulation overlaps
export const DEMO_PHONEME_SEQUENCE: TimedPhoneme[] = [
  // "Let"
  { phoneme: 'L', start: 0.0, end: 0.1 },
  { phoneme: 'EH', start: 0.06, end: 0.18 },
  { phoneme: 'T', start: 0.14, end: 0.24 },
  // "us"
  { phoneme: 'AH', start: 0.28, end: 0.4 },
  { phoneme: 'S', start: 0.35, end: 0.48 },
  // "analyze"
  { phoneme: 'AE', start: 0.52, end: 0.65 },
  { phoneme: 'N', start: 0.6, end: 0.72 },
  { phoneme: 'AH', start: 0.68, end: 0.79 },
  { phoneme: 'L', start: 0.75, end: 0.86 },
  { phoneme: 'AY', start: 0.82, end: 1.0 },
  { phoneme: 'Z', start: 0.95, end: 1.1 },
  // "the"
  { phoneme: 'DH', start: 1.15, end: 1.25 },
  { phoneme: 'AH', start: 1.2, end: 1.32 },
  // "algorithm"
  { phoneme: 'AE', start: 1.36, end: 1.48 },
  { phoneme: 'L', start: 1.43, end: 1.54 },
  { phoneme: 'G', start: 1.5, end: 1.62 },
  { phoneme: 'ER', start: 1.58, end: 1.72 },
  { phoneme: 'IH', start: 1.68, end: 1.82 },
  { phoneme: 'DH', start: 1.78, end: 1.9 },
  { phoneme: 'M', start: 1.86, end: 2.02 },
  // "time"
  { phoneme: 'T', start: 2.1, end: 2.22 },
  { phoneme: 'AY', start: 2.17, end: 2.34 },
  { phoneme: 'M', start: 2.29, end: 2.45 },
  // "complexity"
  { phoneme: 'K', start: 2.5, end: 2.62 },
  { phoneme: 'AA', start: 2.57, end: 2.7 },
  { phoneme: 'M', start: 2.65, end: 2.78 },
  { phoneme: 'P', start: 2.73, end: 2.85 },
  { phoneme: 'L', start: 2.81, end: 2.92 },
  { phoneme: 'EH', start: 2.88, end: 3.02 },
  { phoneme: 'K', start: 2.98, end: 3.12 },
  { phoneme: 'S', start: 3.08, end: 3.22 },
  { phoneme: 'IH', start: 3.18, end: 3.32 },
  { phoneme: 'T', start: 3.28, end: 3.4 },
  { phoneme: 'IY', start: 3.36, end: 3.55 },
];

/**
 * Converts speech text into a stream of timed viseme/phoneme markers.
 * Calibrated precisely for natural conversational speech tempo (~135 wpm)
 * with 20ms coarticulation overlap between adjacent sounds.
 */
export function generatePhonemesFromText(text: string, speechRate = 1.0): TimedPhoneme[] {
  const result: TimedPhoneme[] = [];
  let currentTime = 0.0;
  const words = text.trim().split(/\s+/);

  for (let w = 0; w < words.length; w++) {
    const rawWord = words[w];
    const cleanWord = rawWord.toLowerCase().replace(/[^a-z]/g, '');
    const isPunctuation = /[.,!?;:]$/.test(rawWord);

    if (!cleanWord) {
      if (isPunctuation) currentTime += 0.2 / speechRate;
      continue;
    }

    let i = 0;
    while (i < cleanWord.length) {
      let phoneme = 'AH';
      let duration = 0.09 / speechRate;

      if (i + 1 < cleanWord.length) {
        const pair = cleanWord.substring(i, i + 2);
        if (pair === 'th') {
          phoneme = 'TH';
          duration = 0.095 / speechRate;
          i += 2;
        } else if (pair === 'sh' || pair === 'ch') {
          phoneme = 'CH';
          duration = 0.1 / speechRate;
          i += 2;
        } else if (pair === 'ee' || pair === 'ea') {
          phoneme = 'EE';
          duration = 0.13 / speechRate;
          i += 2;
        } else if (pair === 'oo' || pair === 'ou') {
          phoneme = 'UW';
          duration = 0.12 / speechRate;
          i += 2;
        } else {
          const ch = cleanWord[i];
          if (ch === 'a') {
            phoneme = 'AA';
            duration = 0.12 / speechRate;
          } else if (ch === 'e') {
            phoneme = 'EH';
            duration = 0.1 / speechRate;
          } else if (ch === 'i') {
            phoneme = 'IH';
            duration = 0.095 / speechRate;
          } else if (ch === 'o') {
            phoneme = 'OH';
            duration = 0.115 / speechRate;
          } else if (ch === 'u') {
            phoneme = 'UH';
            duration = 0.11 / speechRate;
          } else if (ch === 'p' || ch === 'b' || ch === 'm') {
            phoneme = 'PP';
            duration = 0.09 / speechRate;
          } else if (ch === 'f' || ch === 'v') {
            phoneme = 'FF';
            duration = 0.085 / speechRate;
          } else if (ch === 't' || ch === 'd') {
            phoneme = 'T';
            duration = 0.08 / speechRate;
          } else if (ch === 's' || ch === 'z') {
            phoneme = 'S';
            duration = 0.09 / speechRate;
          } else if (ch === 'k' || ch === 'c' || ch === 'g') {
            phoneme = 'K';
            duration = 0.085 / speechRate;
          } else {
            phoneme = 'AH';
            duration = 0.08 / speechRate;
          }
          i += 1;
        }
      } else {
        const ch = cleanWord[i];
        if (ch === 'a') {
          phoneme = 'AA';
          duration = 0.12 / speechRate;
        } else if (ch === 'e') {
          phoneme = 'EH';
          duration = 0.1 / speechRate;
        } else if (ch === 'i') {
          phoneme = 'IH';
          duration = 0.095 / speechRate;
        } else if (ch === 'o') {
          phoneme = 'OH';
          duration = 0.115 / speechRate;
        } else if (ch === 'u') {
          phoneme = 'UH';
          duration = 0.11 / speechRate;
        } else if (ch === 'p' || ch === 'b' || ch === 'm') {
          phoneme = 'PP';
          duration = 0.09 / speechRate;
        } else if (ch === 'f' || ch === 'v') {
          phoneme = 'FF';
          duration = 0.085 / speechRate;
        } else {
          phoneme = 'AH';
          duration = 0.08 / speechRate;
        }
        i += 1;
      }

      result.push({
        phoneme,
        start: currentTime,
        end: currentTime + duration,
      });
      // 20ms coarticulation overlap between adjacent phonemes
      currentTime += duration - 0.02 / speechRate;
    }

    currentTime += isPunctuation ? 0.22 / speechRate : 0.08 / speechRate;
  }

  return result;
}

export class LipSyncController {
  private phonemeTimeline: TimedPhoneme[] = [];
  private playbackStartTime: number | null = null;
  private isPlaying = false;
  private currentVisemeWeights: Map<string, number> = new Map();
  private audioReactiveLevel = 0; // 0.0 to 1.0

  // Active word phoneme sequence used for live streaming speech when no timeline is pre-generated
  private currentWordPhonemes: { viseme: string; start: number; end: number }[] = [];

  /**
   * Called on utterance.onboundary.
   * If a timeline is already playing, boundary events adjust playback offset for precision sync.
   * If no timeline is active, generates real-time phonemes for the spoken word.
   */
  public setActiveVisemeFromWord(word: string, currentTimeSec: number) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return;

    // If timeline is playing, avoid blowing away the timeline
    if (this.isPlaying && this.phonemeTimeline.length > 0) {
      return;
    }

    const phonemes = generatePhonemesFromText(clean, 1.0);
    if (phonemes && phonemes.length > 0) {
      this.currentWordPhonemes = phonemes.map((p) => ({
        viseme: PHONEME_TO_VISEME[p.phoneme] || 'viseme_aa',
        start: currentTimeSec + p.start,
        end: currentTimeSec + p.end,
      }));
    } else {
      let phoneme = 'AH';
      const c = clean[0];
      if ('aeiou'.includes(c)) phoneme = 'AA';
      else if ('pb'.includes(c)) phoneme = 'PP';
      else if ('fv'.includes(c)) phoneme = 'FF';
      this.currentWordPhonemes = [
        {
          viseme: PHONEME_TO_VISEME[phoneme] || 'viseme_aa',
          start: currentTimeSec,
          end: currentTimeSec + 0.18,
        },
      ];
    }
  }

  public clearLiveViseme() {
    this.currentWordPhonemes = [];
  }

  public playTimeline(phonemes: TimedPhoneme[], startTimeSec: number) {
    this.phonemeTimeline = phonemes;
    this.playbackStartTime = startTimeSec;
    this.isPlaying = true;
    this.currentWordPhonemes = [];
  }

  public playDemo(startTimeSec: number) {
    this.playTimeline(DEMO_PHONEME_SEQUENCE, startTimeSec);
  }

  public stop() {
    this.isPlaying = false;
    this.playbackStartTime = null;
    this.currentWordPhonemes = [];
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

    // Smooth cubic attack-sustain-release envelope (60ms transition per viseme_timing.json)
    const calculateWeight = (start: number, end: number, time: number): number => {
      const duration = Math.max(0.02, end - start);
      const progress = (time - start) / duration;
      if (progress <= 0.0 || progress >= 1.0) return 0;
      if (progress < 0.25) {
        const t = progress / 0.25;
        return t * t * (3 - 2 * t);
      } else if (progress < 0.7) {
        return 1.0;
      } else {
        const t = (1.0 - progress) / 0.3;
        return t * t * (3 - 2 * t);
      }
    };

    // 1. Play from timeline if active
    if (this.isPlaying && this.playbackStartTime !== null && this.phonemeTimeline.length > 0) {
      const elapsed = currentTimeSec - this.playbackStartTime;
      const lastPhoneme = this.phonemeTimeline[this.phonemeTimeline.length - 1];

      if (lastPhoneme && elapsed > lastPhoneme.end + 0.2) {
        this.stop();
      } else {
        for (const p of this.phonemeTimeline) {
          if (elapsed >= p.start && elapsed <= p.end) {
            const viseme = PHONEME_TO_VISEME[p.phoneme] || 'viseme_aa';
            const w = calculateWeight(p.start, p.end, elapsed) * 0.88;
            targetWeights.set(viseme, Math.max(targetWeights.get(viseme) || 0, w));
          }
        }
      }
    }
    // 2. Play from live word stream if timeline is not active
    else if (this.currentWordPhonemes.length > 0) {
      for (const p of this.currentWordPhonemes) {
        if (currentTimeSec >= p.start && currentTimeSec <= p.end) {
          const w = calculateWeight(p.start, p.end, currentTimeSec) * 0.88;
          targetWeights.set(p.viseme, Math.max(targetWeights.get(p.viseme) || 0, w));
        }
      }
      const last = this.currentWordPhonemes[this.currentWordPhonemes.length - 1];
      if (last && currentTimeSec > last.end + 0.1) {
        this.currentWordPhonemes = [];
      }
    }

    // 3. Audio reactivity fallback when external audio reactive level is present
    if (
      this.audioReactiveLevel > 0.05 &&
      !this.isPlaying &&
      this.currentWordPhonemes.length === 0
    ) {
      const openWeight = Math.min(0.4, this.audioReactiveLevel * 0.6);
      targetWeights.set('viseme_aa', openWeight * 0.45);
      targetWeights.set('viseme_O', openWeight * 0.25);
    }

    // Single-pass exponential dampening filter (Attack ~55ms, Decay ~80ms)
    // Matches default_blend_duration_ms (60ms) from viseme_timing.json
    const attackRate = Math.min(1.0, deltaTime * 18.0);
    const decayRate = Math.min(1.0, deltaTime * 12.0);

    const allKeys = new Set<string>();
    this.currentVisemeWeights.forEach((_, k) => allKeys.add(k));
    targetWeights.forEach((_, k) => allKeys.add(k));

    allKeys.forEach((key) => {
      const current = this.currentVisemeWeights.get(key) || 0;
      const target = targetWeights.get(key) || 0;
      const rate = target > current ? attackRate : decayRate;
      const nextVal = current + (target - current) * rate;

      // Silence threshold cutoff to prevent micro-twitches (per viseme_timing.json)
      if (nextVal < 0.008 && target === 0) {
        this.currentVisemeWeights.delete(key);
      } else {
        this.currentVisemeWeights.set(key, nextVal);
      }
    });

    return this.currentVisemeWeights;
  }
}
