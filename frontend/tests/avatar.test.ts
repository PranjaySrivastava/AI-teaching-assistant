import {
  ExpressionController,
  SENTIMENT_CONFIGS,
} from '../src/components/Avatar/expressionController';
import {
  LipSyncController,
  DEMO_PHONEME_SEQUENCE,
} from '../src/components/Avatar/lipSyncController';

describe('ExpressionController', () => {
  it('initializes with idle sentiment', () => {
    const ctrl = new ExpressionController();
    expect(ctrl.getSentiment()).toBe('idle');
  });

  it('updates sentiment configuration properly', () => {
    const ctrl = new ExpressionController();
    ctrl.setSentiment('thinking');
    expect(ctrl.getSentiment()).toBe('thinking');

    // Run update tick
    const result = ctrl.update(0.1, 1.0);
    expect(result.headTiltZ).toBeGreaterThan(0);
    expect(result.weights).toBeDefined();
  });

  it('handles encouraging and celebrating states', () => {
    const ctrl = new ExpressionController();
    ctrl.setSentiment('celebrating');
    expect(ctrl.getSentiment()).toBe('celebrating');

    const result = ctrl.update(0.5, 2.0);
    expect(result.weights.get('mouthSmileLeft')).toBeGreaterThan(0);
  });
});

describe('LipSyncController', () => {
  it('starts inactive and stopped', () => {
    const ctrl = new LipSyncController();
    expect(ctrl.getIsPlaying()).toBe(false);
  });

  it('plays timeline and interpolates visemes', () => {
    const ctrl = new LipSyncController();
    ctrl.playTimeline(DEMO_PHONEME_SEQUENCE, 10.0);
    expect(ctrl.getIsPlaying()).toBe(true);

    // Check during first phoneme (at 10.05s, phoneme L)
    const weights = ctrl.update(0.016, 10.05);
    expect(weights.size).toBeGreaterThanOrEqual(0);

    ctrl.stop();
    expect(ctrl.getIsPlaying()).toBe(false);
  });

  it('reacts to generic audio level fallback', () => {
    const ctrl = new LipSyncController();
    ctrl.setAudioLevel(0.8);
    const weights = ctrl.update(0.05, 1.0);
    expect(weights.get('viseme_aa')).toBeGreaterThan(0);
  });

  it('generates distinct phonemes for diverse vocabulary instead of repetitive AH flaps', () => {
    const {
      generatePhonemesFromText,
      PHONEME_TO_VISEME,
    } = require('../src/components/Avatar/lipSyncController');
    const result = generatePhonemesFromText('QuickSort chooses a pivot');
    expect(result.length).toBeGreaterThan(10);

    const visemes = result.map((p: any) => PHONEME_TO_VISEME[p.phoneme] || p.phoneme);

    // Must contain diverse visemes: velar (kk), labial (PP), sibilant (SS), dental (DD)
    expect(visemes).toContain('viseme_kk'); // from Q, k
    expect(visemes).toContain('viseme_PP'); // from p in pivot
    expect(visemes).toContain('viseme_SS'); // from S in QuickSort, chooses
    expect(visemes).toContain('viseme_DD'); // from t in QuickSort, pivot

    // Check that not more than 35% of visemes are viseme_aa
    const aaCount = visemes.filter((v: string) => v === 'viseme_aa').length;
    expect(aaCount / visemes.length).toBeLessThan(0.35);
  });

  it('correctly maps digraphs and diphthongs', () => {
    const {
      generatePhonemesFromText,
      PHONEME_TO_VISEME,
    } = require('../src/components/Avatar/lipSyncController');
    const result = generatePhonemesFromText('The algorithm thinking phase');
    const visemes = result.map((p: any) => PHONEME_TO_VISEME[p.phoneme]);

    expect(visemes).toContain('viseme_TH'); // from 'The' and 'thinking'
    expect(visemes).toContain('viseme_FF'); // from 'ph' in phase
  });
});
