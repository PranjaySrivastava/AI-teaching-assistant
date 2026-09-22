export type Sentiment = 'idle' | 'thinking' | 'explaining' | 'encouraging' | 'celebrating';

export interface SentimentConfig {
  headTiltDegrees: number;
  blinkRatePerMinute: number;
  blendshapeWeights: Record<string, number>;
  description: string;
}

export const SENTIMENT_CONFIGS: Record<Sentiment, SentimentConfig> = {
  idle: {
    description: 'Approachable, warm resting pose with gentle breathing',
    headTiltDegrees: 0.0,
    blinkRatePerMinute: 14,
    blendshapeWeights: {
      mouthSmileLeft: 0.06,
      mouthSmileRight: 0.06,
      mouthDimpleLeft: 0.04,
      mouthDimpleRight: 0.04,
    },
  },
  thinking: {
    description: 'Intellectual analysis, contemplating algorithmic trade-offs',
    headTiltDegrees: 2.8,
    blinkRatePerMinute: 9,
    blendshapeWeights: {
      browInnerUp: 0.24,
      browOuterUpLeft: 0.2,
      browOuterUpRight: 0.06,
      browDownRight: 0.08,
      eyeLookUpLeft: 0.22,
      eyeLookUpRight: 0.22,
      eyeLookOutLeft: 0.12,
      eyeLookInRight: 0.12,
      mouthDimpleLeft: 0.14,
      mouthDimpleRight: 0.06,
      mouthPucker: 0.08,
      mouthSmileLeft: 0.03,
      mouthSmileRight: 0.02,
    },
  },
  explaining: {
    description: 'Active, inspiring teaching mode with high clarity and intellectual focus',
    headTiltDegrees: -1.2,
    blinkRatePerMinute: 12,
    blendshapeWeights: {
      browInnerUp: 0.2,
      browOuterUpLeft: 0.16,
      browOuterUpRight: 0.14,
      eyeWideLeft: 0.1,
      eyeWideRight: 0.09,
      mouthSmileLeft: 0.14,
      mouthSmileRight: 0.12,
      mouthDimpleLeft: 0.09,
      mouthDimpleRight: 0.09,
      cheekSquintLeft: 0.07,
      cheekSquintRight: 0.06,
    },
  },
  encouraging: {
    description: 'Supportive, empathetic mentor cheering on the student',
    headTiltDegrees: -2.2,
    blinkRatePerMinute: 10,
    blendshapeWeights: {
      mouthSmileLeft: 0.26,
      mouthSmileRight: 0.26,
      mouthDimpleLeft: 0.15,
      mouthDimpleRight: 0.15,
      browInnerUp: 0.24,
      browOuterUpLeft: 0.08,
      browOuterUpRight: 0.08,
      eyeSquintLeft: 0.14,
      eyeSquintRight: 0.14,
      cheekSquintLeft: 0.22,
      cheekSquintRight: 0.22,
    },
  },
  celebrating: {
    description: 'Elated triumph! Student mastered the concept',
    headTiltDegrees: -3.5,
    blinkRatePerMinute: 8,
    blendshapeWeights: {
      mouthSmileLeft: 0.4,
      mouthSmileRight: 0.4,
      mouthDimpleLeft: 0.18,
      mouthDimpleRight: 0.18,
      browInnerUp: 0.26,
      browOuterUpLeft: 0.22,
      browOuterUpRight: 0.22,
      eyeWideLeft: 0.15,
      eyeWideRight: 0.15,
      cheekSquintLeft: 0.26,
      cheekSquintRight: 0.26,
      mouthOpen: 0.12,
      jawOpen: 0.07,
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

  // Spontaneous Biological Micro-Expression Engine (Living Face Dynamics)
  private microBrowPulse = 0;
  private microSmilePulse = 0;
  private nextMicroExpressionTime = 0;

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
    // 1. Lerp sentiment blendshapes smoothly (transition speed ~ 5.5)
    const lerpSpeed = Math.min(1.0, deltaTime * 5.5);

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

    // 2. Spontaneous Biological Micro-Expressions (Living Human Engine)
    // Injects subtle organic pulses so the face never appears frozen
    if (currentTimeSec >= this.nextMicroExpressionTime) {
      this.microBrowPulse = 0.04 + Math.random() * 0.07;
      this.microSmilePulse = 0.03 + Math.random() * 0.05;
      this.nextMicroExpressionTime = currentTimeSec + 3.0 + Math.random() * 3.5;
    }
    this.microBrowPulse *= Math.max(0, 1.0 - deltaTime * 1.8);
    this.microSmilePulse *= Math.max(0, 1.0 - deltaTime * 1.8);

    const blendedWeights = new Map<string, number>(this.currentWeights);
    if (this.microBrowPulse > 0.005) {
      blendedWeights.set(
        'browInnerUp',
        (blendedWeights.get('browInnerUp') || 0) + this.microBrowPulse
      );
    }
    if (this.microSmilePulse > 0.005) {
      blendedWeights.set(
        'mouthSmileLeft',
        (blendedWeights.get('mouthSmileLeft') || 0) + this.microSmilePulse
      );
      blendedWeights.set(
        'mouthSmileRight',
        (blendedWeights.get('mouthSmileRight') || 0) + this.microSmilePulse
      );
      blendedWeights.set(
        'cheekSquintLeft',
        (blendedWeights.get('cheekSquintLeft') || 0) + this.microSmilePulse * 0.7
      );
      blendedWeights.set(
        'cheekSquintRight',
        (blendedWeights.get('cheekSquintRight') || 0) + this.microSmilePulse * 0.7
      );
    }

    // 3. Head tilt lerp
    this.currentHeadTilt +=
      (this.targetHeadTilt - this.currentHeadTilt) * Math.min(1.0, deltaTime * 4.0);

    // 4. Periodic natural blinking
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
      weights: blendedWeights,
      headTiltZ: this.currentHeadTilt,
      blinkWeight,
    };
  }
}
