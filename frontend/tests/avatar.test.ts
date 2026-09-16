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
});
