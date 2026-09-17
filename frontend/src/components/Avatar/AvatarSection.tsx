'use client';

import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Volume2,
  Smile,
  Brain,
  BookOpen,
  ThumbsUp,
  PartyPopper,
} from 'lucide-react';
import { AvatarCanvas } from './AvatarCanvas';
import { Sentiment } from './expressionController';
import { DEMO_PHONEME_SEQUENCE, TimedPhoneme, generatePhonemesFromText } from './lipSyncController';

export interface AvatarSectionProps {
  currentSentiment?: Sentiment;
  isListening?: boolean;
  isSpeaking?: boolean;
  activePhonemes?: TimedPhoneme[] | null;
  spokenText?: string;
  /** Ref whose .current is set to a function that forwards word boundary events to the lip-sync controller */
  onWordBoundaryRef?: React.MutableRefObject<((word: string) => void) | null>;
  /** Callback fired when user selects a mood in the UI */
  onSentimentChange?: (sentiment: Sentiment) => void;
}

const SENTIMENT_ICONS: Record<Sentiment, React.ComponentType<{ className?: string }>> = {
  idle: Smile,
  thinking: Brain,
  explaining: BookOpen,
  encouraging: ThumbsUp,
  celebrating: PartyPopper,
};

const SENTIMENT_COLORS: Record<Sentiment, { text: string; bg: string; border: string }> = {
  idle: { text: 'text-slate-300', bg: 'bg-slate-800/80', border: 'border-slate-700/60' },
  thinking: { text: 'text-amber-300', bg: 'bg-amber-950/40', border: 'border-amber-700/40' },
  explaining: { text: 'text-cyan-300', bg: 'bg-cyan-950/50', border: 'border-cyan-700/50' },
  encouraging: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-700/40',
  },
  celebrating: { text: 'text-purple-300', bg: 'bg-purple-950/50', border: 'border-purple-700/50' },
};

export const AvatarSection: React.FC<AvatarSectionProps> = ({
  currentSentiment: propSentiment,
  isListening = false,
  isSpeaking: propIsSpeaking = false,
  activePhonemes: propPhonemes = null,
  spokenText,
  onWordBoundaryRef,
  onSentimentChange,
}) => {
  const [sentiment, setSentiment] = useState<Sentiment>(propSentiment || 'explaining');
  const [internalPhonemes, setInternalPhonemes] = useState<TimedPhoneme[] | null>(null);
  const [isSpeakingTest, setIsSpeakingTest] = useState<boolean>(false);
  const [showGlasses, setShowGlasses] = useState<boolean>(false);

  const updateSentiment = (newMood: Sentiment) => {
    setSentiment(newMood);
    onSentimentChange?.(newMood);
  };

  const isSpeaking = propIsSpeaking || isSpeakingTest;
  const phonemes = propPhonemes || internalPhonemes;

  const localWordBoundaryRef = React.useRef<((word: string) => void) | null>(null);
  const effectiveBoundaryRef = onWordBoundaryRef || localWordBoundaryRef;

  // Sync prop if provided
  React.useEffect(() => {
    if (propSentiment) setSentiment(propSentiment);
  }, [propSentiment]);

  // When listening to student, automatically switch to thinking or attentive
  React.useEffect(() => {
    if (isListening) {
      setSentiment('thinking');
    }
  }, [isListening]);

  const handleTestSpeech = () => {
    if (isSpeaking) return;
    setSentiment('explaining');

    const testSentence = 'Let us analyze the algorithm time complexity.';
    // Use studio-calibrated DEMO_PHONEME_SEQUENCE perfectly matched to this sentence
    setInternalPhonemes(DEMO_PHONEME_SEQUENCE);

    // Use Web Speech API to speak the sample sentence simultaneously
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      try {
        window.speechSynthesis.resume();
      } catch {}

      const utterance = new SpeechSynthesisUtterance(testSentence);
      (window as any).__activeTestUtterance = utterance;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select natural English voice if available in browser
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Jenny') ||
            v.name.includes('Aria') ||
            v.name.includes('Guy') ||
            v.name.includes('Zira') ||
            v.name.includes('Samantha') ||
            v.name.includes('David'))
      );
      if (voice) utterance.voice = voice;

      // Only start mouth animation at the exact instant audio begins
      utterance.onstart = () => {
        setIsSpeakingTest(true);
      };

      // Accurate word boundary extraction for live lip-sync
      utterance.onboundary = (ev) => {
        if (ev.name === 'word') {
          const remainder = testSentence.slice(ev.charIndex);
          const match = remainder.match(/^[\w']+/);
          const word = match ? match[0] : '';
          if (word) effectiveBoundaryRef.current?.(word);
        }
      };

      utterance.onend = () => {
        setIsSpeakingTest(false);
        setInternalPhonemes(null);
        setSentiment('encouraging');
        (window as any).__activeTestUtterance = null;
      };

      utterance.onerror = () => {
        setIsSpeakingTest(false);
        setInternalPhonemes(null);
        setSentiment('idle');
        (window as any).__activeTestUtterance = null;
      };

      window.speechSynthesis.speak(utterance);
      try {
        window.speechSynthesis.resume();
      } catch {}
    } else {
      setIsSpeakingTest(true);
      setTimeout(() => {
        setIsSpeakingTest(false);
        setInternalPhonemes(null);
        setSentiment('encouraging');
      }, 3500);
    }
  };

  const Icon = SENTIMENT_ICONS[sentiment];
  const color = SENTIMENT_COLORS[sentiment];

  return (
    <div className="h-full min-h-[300px] rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950 p-3.5 flex flex-col relative overflow-hidden shadow-2xl">
      {/* Background Cyber Ambient Light */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_35%,rgba(6,182,212,0.18),transparent_70%)]" />

      {/* Top Status Bar */}
      <div className="flex items-center justify-between relative z-10 mb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-slate-200">Professor Ada</h2>
            <p className="text-[10px] text-slate-400">DS&A AI Tutor</p>
          </div>
        </div>

        {/* Dynamic Sentiment Status Badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${color.bg} ${color.text} ${color.border} backdrop-blur-md transition-all duration-300`}
        >
          <Icon className="w-3 h-3" />
          <span className="capitalize">{sentiment}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        </div>
      </div>

      {/* 3D Three.js Avatar Viewport */}
      <div className="flex-1 w-full min-h-[180px] relative rounded-xl overflow-hidden border border-slate-800/80 bg-gradient-to-b from-slate-900/60 via-slate-950/80 to-slate-950 my-1.5 shadow-2xl">
        {/* Soft Studio Halo behind Avatar */}
        <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-[35%] left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        {/* Viewport Corner Tech Accents */}
        <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-cyan-500/40 rounded-tl pointer-events-none" />
        <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-cyan-500/40 rounded-tr pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-cyan-500/40 rounded-bl pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-cyan-500/40 rounded-br pointer-events-none" />

        <AvatarCanvas
          sentiment={sentiment}
          isSpeaking={isSpeaking}
          phonemeTimeline={phonemes}
          showGlasses={showGlasses}
          onWordBoundaryRef={effectiveBoundaryRef}
          spokenText={spokenText}
        />

        {/* Speaking Audio Indicator Overlay */}
        {isSpeaking && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/95 border border-cyan-500/30 text-cyan-300 text-xs backdrop-blur-md shadow-lg">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
            <span className="truncate">
              {spokenText ? `"${spokenText}"` : 'Professor Ada is explaining...'}
            </span>
          </div>
        )}
      </div>

      {/* Expression & Lip-Sync Toolbar */}
      <div className="relative z-10 flex flex-col gap-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-medium uppercase tracking-wider text-[10px] text-slate-500">
              Avatar
            </span>
            <button
              type="button"
              onClick={() => setShowGlasses(!showGlasses)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all border ${
                showGlasses
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/50'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:text-slate-200'
              }`}
            >
              👓 Glasses: {showGlasses ? 'On' : 'Off'}
            </button>
          </div>
          <button
            type="button"
            onClick={handleTestSpeech}
            disabled={isSpeakingTest}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              isSpeakingTest
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50 cursor-not-allowed opacity-75'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isSpeakingTest ? 'Lip-Sync Active...' : 'Test Voice Lip-Sync'}
          </button>
        </div>

        {/* Mood Switcher Pills */}
        <div className="grid grid-cols-5 gap-1.5">
          {(['idle', 'thinking', 'explaining', 'encouraging', 'celebrating'] as Sentiment[]).map(
            (mood) => {
              const MoodIcon = SENTIMENT_ICONS[mood];
              const isSelected = sentiment === mood;
              return (
                <button
                  key={mood}
                  type="button"
                  onClick={() => updateSentiment(mood)}
                  title={`Switch Avatar Expression to ${mood}`}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-medium capitalize transition-all border ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10 scale-105'
                      : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <MoodIcon className="w-3.5 h-3.5 mb-0.5" />
                  <span className="truncate">{mood}</span>
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarSection;
