export type Sentiment = 'idle' | 'thinking' | 'explaining' | 'encouraging' | 'celebrating';

export interface SentimentConfig {
  headTiltDegrees: number;
  blinkRatePerMinute: number;
  blendshapeWeights: Record<string, number>;
  description: string;
}

export const SENTIMENT_CONFIGS: Record<Sentiment, SentimentConfig> = {
  idle: {
    description: 'Neutral resting pose with gentle breathing',
    headTiltDegrees: 0.0,
    blinkRatePerMinute: 14,
    blendshapeWeights: {
      mouthSmileLeft: 0.0,
      mouthSmileRight: 0.0,
    },
  },
  thinking: {
    description: 'Professor Ada analyzing complex algorithm problem',
    headTiltDegrees: 2.0,
    blinkRatePerMinute: 10,
    blendshapeWeights: {
      browInnerUp: 0.18,
      browOuterUpLeft: 0.06,
      browOuterUpRight: 0.06,
      eyeLookUpLeft: 0.14,
      eyeLookUpRight: 0.14,
      mouthSmileLeft: 0.02,
      mouthSmileRight: 0.02,
    },
  },
  explaining: {
    description: 'Active teaching mode explaining code logic',
    headTiltDegrees: -0.8,
    blinkRatePerMinute: 12,
    blendshapeWeights: {
      browInnerUp: 0.1,
      browOuterUpLeft: 0.1,
      browOuterUpRight: 0.1,
      mouthSmileLeft: 0.08,
      mouthSmileRight: 0.08,
      eyeWideLeft: 0.06,
      eyeWideRight: 0.06,
    },
  },
  encouraging: {
    description: 'Motivating the student with a warm smile',
    headTiltDegrees: -1.5,
    blinkRatePerMinute: 10,
    blendshapeWeights: {
      mouthSmileLeft: 0.18,
      mouthSmileRight: 0.18,
      browInnerUp: 0.08,
      eyeWideLeft: 0.06,
      eyeWideRight: 0.06,
    },
  },
  celebrating: {
    description: 'Student solved the problem correctly!',
    headTiltDegrees: -2.5,
    blinkRatePerMinute: 8,
    blendshapeWeights: {
      mouthSmileLeft: 0.32,
      mouthSmileRight: 0.32,
      browInnerUp: 0.14,
      browOuterUpLeft: 0.14,
      browOuterUpRight: 0.14,
      mouthOpen: 0.1,
      jawOpen: 0.06,
    },
  },
};

export class ExpressionController {
  private currentSentiment: Sentiment = 'idle';
  private targetSentiment: Sentiment = 'idle';
  private currentWeights: Map<string, number> = new Map();
  private targetWeights: Map<string, number> = new Map();
  private currentHeadTilt = 0;
  private targetHeadTilt = 0;

  // Blink state
  private blinkProgress = 0; // 0 = open, 1 = fully closed
  private isBlinking = false;
  private nextBlinkTime = 0;

  constructor() {
    this.setSentiment('idle');
  }

  public setSentiment(sentiment: Sentiment) {
    this.targetSentiment = sentiment;
    const config = SENTIMENT_CONFIGS[sentiment];
    this.targetHeadTilt = (config.headTiltDegrees * Math.PI) / 180;

    // Build target weights map
    const newTarget = new Map<string, number>();
    Object.entries(config.blendshapeWeights).forEach(([key, val]) => {
      newTarget.set(key, val);
    });
    this.targetWeights = newTarget;
  }

  public getSentiment(): Sentiment {
    return this.targetSentiment;
  }

  public update(
    deltaTime: number,
    currentTimeSec: number
  ): {
    weights: Map<string, number>;
    headTiltZ: number;
    blinkWeight: number;
  } {
    // 1. Lerp sentiment blendshapes smoothly (transition speed ~ 5.0)
    const lerpSpeed = Math.min(1.0, deltaTime * 5.0);

    // Fade out missing weights
    this.currentWeights.forEach((val, key) => {
      if (!this.targetWeights.has(key)) {
        const nextVal = val + (0 - val) * lerpSpeed;
        if (Math.abs(nextVal) < 0.001) {
          this.currentWeights.delete(key);
        } else {
          this.currentWeights.set(key, nextVal);
        }
      }
    });

    // Fade in target weights
    this.targetWeights.forEach((targetVal, key) => {
      const currentVal = this.currentWeights.get(key) || 0;
      const nextVal = currentVal + (targetVal - currentVal) * lerpSpeed;
      this.currentWeights.set(key, nextVal);
    });

    // 2. Head tilt lerp
    this.currentHeadTilt +=
      (this.targetHeadTilt - this.currentHeadTilt) * Math.min(1.0, deltaTime * 4.0);

    // 3. Periodic natural blinking
    const config = SENTIMENT_CONFIGS[this.targetSentiment];
    const avgIntervalSec = 60 / Math.max(1, config.blinkRatePerMinute);

    if (currentTimeSec >= this.nextBlinkTime && !this.isBlinking) {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }

    if (this.isBlinking) {
      // Blink duration ~ 160ms
      this.blinkProgress += deltaTime / 0.16;
      if (this.blinkProgress >= 1.0) {
        this.isBlinking = false;
        this.blinkProgress = 0;
        // Schedule next blink with random jitter (+/- 30%)
        const jitter = (Math.random() - 0.5) * 0.6 * avgIntervalSec;
        this.nextBlinkTime = currentTimeSec + avgIntervalSec + jitter;
      }
    }

    // Blink curve: smooth bell curve (0 -> 1 -> 0)
    let blinkWeight = 0;
    if (this.isBlinking) {
      blinkWeight = Math.sin(this.blinkProgress * Math.PI);
    }

    return {
      weights: this.currentWeights,
      headTiltZ: this.currentHeadTilt,
      blinkWeight,
    };
  }
}
