'use client';

import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Mic, MicOff, Play, Sparkles, Code2, BarChart3, Bot, Send } from 'lucide-react';
import { Sentiment } from '../components/Avatar/expressionController';
import { TimedPhoneme, generatePhonemesFromText } from '../components/Avatar/lipSyncController';
import { assemblyAiStream } from '../services/assemblyAiStream';

const AvatarSection = dynamic(() => import('../components/Avatar/AvatarSection'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 min-h-[420px] rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin mb-3" />
      <p className="text-xs text-slate-400">Loading 3D Avatar...</p>
    </div>
  ),
});

const DEFAULT_QUICKSORT_CODE = `// QuickSort Python/JavaScript Implementation
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[arr.length - 1];
  const left = [];
  const right = [];
  
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] < pivot) {
      left.push(arr[i]);
    } else {
      right.push(arr[i]);
    }
  }
  
  return [...quickSort(left), pivot, ...quickSort(right)];
}`;

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [question, setQuestion] = useState('');
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [arrayState, setArrayState] = useState([45, 23, 89, 12, 77, 34, 60]);

  // Dynamic Teacher & LLM Orchestration State
  const [sentiment, setSentiment] = useState<Sentiment>('explaining');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePhonemes, setActivePhonemes] = useState<TimedPhoneme[] | null>(null);
  const [spokenText, setSpokenText] = useState('');
  const [algorithmTitle, setAlgorithmTitle] = useState('QuickSort Execution State');
  const [codeSnippet, setCodeSnippet] = useState(DEFAULT_QUICKSORT_CODE);

  // Ref that AvatarCanvas will populate with a function to forward word boundary events
  const onWordBoundaryRef = useRef<((word: string) => void) | null>(null);
  // Persistent reference to prevent Chrome/V8 garbage collection mid-speech
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSafetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Reference for server audio playback (Option B: ElevenLabs)
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const speakStatement = (statementText: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeaking(true);
      setTimeout(
        () => {
          setIsSpeaking(false);
          setActivePhonemes(null);
          setSentiment('encouraging');
        },
        Math.min(12000, Math.max(3000, statementText.split(/\s+/).length * 320))
      );
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {}

    if (speechSafetyTimerRef.current) {
      clearTimeout(speechSafetyTimerRef.current);
      speechSafetyTimerRef.current = null;
    }

    const utterance = new SpeechSynthesisUtterance(statementText);
    activeUtteranceRef.current = utterance;
    (window as any).__activeUtterance = utterance;

    utterance.rate = 1.02;
    utterance.pitch = 1.0;

    // Pick natural, expressive voice if available
    const selectBestVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return null;
      return (
        voices.find(
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
        ) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0]
      );
    };

    const bestVoice = selectBestVoice();
    if (bestVoice) utterance.voice = bestVoice;

    if (window.speechSynthesis.onvoiceschanged === null) {
      window.speechSynthesis.onvoiceschanged = () => {
        const v = selectBestVoice();
        if (v && activeUtteranceRef.current) {
          activeUtteranceRef.current.voice = v;
        }
      };
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onboundary = (ev) => {
      if (ev.name === 'word') {
        const remainder = statementText.slice(ev.charIndex);
        const match = remainder.match(/^[\w']+/);
        const word = match ? match[0] : '';
        if (word) {
          onWordBoundaryRef.current?.(word);
        }
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setActivePhonemes(null);
      setSentiment('encouraging');
      activeUtteranceRef.current = null;
    };

    utterance.onerror = (ev) => {
      console.warn('Speech synthesis finished or canceled:', ev);
      setIsSpeaking(false);
      setActivePhonemes(null);
      setSentiment('idle');
      activeUtteranceRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
    try {
      window.speechSynthesis.resume();
    } catch {}

    // Safety fallback: ensure isSpeaking becomes true even if onstart event is delayed
    speechSafetyTimerRef.current = setTimeout(() => {
      if (activeUtteranceRef.current === utterance) {
        setIsSpeaking(true);
      }
    }, 150);

    // Keep-alive for longer pedagogical explanations to counter Chromium's 15s pause bug
    const keepAlive = setInterval(() => {
      if (!window.speechSynthesis.speaking || activeUtteranceRef.current !== utterance) {
        clearInterval(keepAlive);
      } else {
        try {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } catch {}
      }
    }, 8000);
  };

  const askQuestion = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setQuestion('');
    setSentiment('thinking');
    setSpokenText(`Analyzing: "${q}"...`);

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'https://ai-teaching-assistant-backend-service.onrender.com';

    try {
      const res = await fetch(`${backendUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const answer = data.answer || data.explanation || 'Here is the step-by-step explanation.';
      setSpokenText(answer);
      setSentiment(data.mood || 'explaining');

      if (data.code?.snippet) {
        setCodeSnippet(data.code.snippet);
      }
      if (data.visualSequence?.title) {
        setAlgorithmTitle(data.visualSequence.title);
      }

      // Option B: Server Audio with ElevenLabs Timestamps (if returned from backend)
      if (data.audioUrl && typeof data.audioUrl === 'string' && data.audioUrl.trim().length > 0) {
        if (
          data.phonemeTimings &&
          Array.isArray(data.phonemeTimings) &&
          data.phonemeTimings.length > 0
        ) {
          setActivePhonemes(data.phonemeTimings);
        } else {
          setActivePhonemes(generatePhonemesFromText(answer, 1.02));
        }

        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current = null;
        }

        const audio = new Audio(data.audioUrl);
        audioElementRef.current = audio;

        audio.onplay = () => {
          setIsSpeaking(true);
        };
        audio.onended = () => {
          setIsSpeaking(false);
          setActivePhonemes(null);
          setSentiment('encouraging');
          audioElementRef.current = null;
        };
        audio.onerror = () => {
          console.warn('Error playing server audio, falling back to client speech synthesis');
          audioElementRef.current = null;
          speakStatement(answer);
        };

        audio.play().catch((err) => {
          console.warn('Audio autoplay restricted, falling back to client speech synthesis:', err);
          speakStatement(answer);
        });
      } else {
        // Zero-Lag Procedural Phonemes + Real-time Word Boundary Sync
        const phonemes = generatePhonemesFromText(answer, 1.05);
        setActivePhonemes(phonemes);
        speakStatement(answer);
      }
    } catch (err) {
      console.warn('Backend query error, using local fallback:', err);
      const fallbackAnswer = `Let us analyze ${q}. In computer science, we examine the problem constraints and asymptotic complexity to formulate the optimal approach.`;
      setSpokenText(fallbackAnswer);
      setSentiment('explaining');
      const phonemes = generatePhonemesFromText(fallbackAnswer, 1.05);
      setActivePhonemes(phonemes);

      speakStatement(fallbackAnswer);
    }
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    askQuestion(question);
  };

  const recognitionRef = useRef<any>(null);

  // Fallback to browser SpeechRecognition if AssemblyAI WebSocket is not available
  const startBrowserSpeechFallback = () => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          let capturedTranscript = '';

          recognition.onstart = () => {
            setIsRecording(true);
            setQuestion('Listening to your voice...');
          };

          recognition.onresult = (event: any) => {
            capturedTranscript = Array.from(event.results)
              .map((res: any) => res[0].transcript)
              .join('');
            setQuestion(capturedTranscript);
          };

          recognition.onend = () => {
            setIsRecording(false);
            const finalQuery = capturedTranscript.trim();
            if (finalQuery && finalQuery !== 'Listening to your voice...') {
              askQuestion(finalQuery);
            }
          };

          recognition.onerror = (err: any) => {
            console.warn('Speech recognition error, using sample question fallback:', err);
            setIsRecording(false);
            askQuestion('How does QuickSort choose a pivot?');
          };

          recognitionRef.current = recognition;
          recognition.start();
          return;
        } catch (err) {
          console.warn('Could not start live voice recognition, using fallback:', err);
        }
      }
    }

    // Ultimate fallback if microphone access is completely unavailable
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      askQuestion('How does QuickSort choose a pivot?');
    }, 1200);
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (assemblyAiStream.getIsStreaming()) {
        assemblyAiStream.stop();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      return;
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'https://ai-teaching-assistant-backend-service.onrender.com';

    // Option A: Try AssemblyAI Real-Time WebSocket Streaming first
    assemblyAiStream
      .start(backendUrl, {
        onPartialTranscript: (transcript) => {
          if (transcript) setQuestion(transcript);
        },
        onFinalTranscript: (transcript) => {
          if (transcript) {
            setQuestion(transcript);
            setIsRecording(false);
            askQuestion(transcript);
          }
        },
        onStateChange: (streaming) => {
          setIsRecording(streaming);
        },
        onError: (err) => {
          console.warn(
            'AssemblyAI streaming error, falling back to browser SpeechRecognition:',
            err.message
          );
          startBrowserSpeechFallback();
        },
      })
      .then(() => {
        setIsRecording(true);
        setQuestion('Listening via AssemblyAI Streaming...');
      })
      .catch((err) => {
        console.warn(
          'AssemblyAI streaming setup failed, falling back to browser SpeechRecognition:',
          err.message
        );
        startBrowserSpeechFallback();
      });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                AI Teaching Assistant
              </h1>
              <p className="text-xs text-slate-400">Voice-First 3D Avatar & Algorithm Visualizer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              AssemblyAI Live Pipeline
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Avatar Viewport & Voice Controller */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* 3D Interactive Avatar Section */}
          <AvatarSection
            currentSentiment={sentiment}
            isListening={isRecording}
            isSpeaking={isSpeaking}
            activePhonemes={activePhonemes}
            spokenText={spokenText}
            onWordBoundaryRef={onWordBoundaryRef}
          />

          {/* Voice Control Hub */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative z-10 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-300">
                  {isRecording ? 'Listening (AssemblyAI Streaming)...' : 'Microphone Ready'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isRecording ? 'Speak your DS&A question' : 'Click to ask with your voice'}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleRecording}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                className={`p-3.5 rounded-full transition-all shadow-lg ${
                  isRecording
                    ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/30'
                }`}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Quick Questions Box */}
          <div className="flex flex-col gap-2">
            <form onSubmit={handleAsk} className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question (e.g., 'How does QuickSort choose a pivot?')..."
                className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 text-slate-200 placeholder-slate-500 transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'How does QuickSort choose a pivot?',
                'Explain Binary Search step by step',
                'What is Big-O time complexity?',
                'Why is MergeSort O(n log n)?',
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => askQuestion(chip)}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Visualizer & Code Workspace */}
        <section className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-2xl">
          {/* Tabs */}
          <div className="border-b border-slate-800 px-6 pt-3 flex items-center justify-between bg-slate-900/90">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('visual')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                  activeTab === 'visual'
                    ? 'border-cyan-400 text-cyan-400 bg-slate-800/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Algorithm Visualizer
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                  activeTab === 'code'
                    ? 'border-cyan-400 text-cyan-400 bg-slate-800/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-4 h-4" />
                Implementation Code
              </button>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              OpenRouter Reasoning Engine
            </span>
          </div>

          {/* Panel Content */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            {activeTab === 'visual' ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <div className="w-full max-w-lg mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400 font-medium">{algorithmTitle}</span>
                    <span className="text-xs text-cyan-400">Pivot: 45</span>
                  </div>

                  {/* Dynamic Array visualization bars */}
                  <div className="h-44 bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-end justify-center gap-3">
                    {arrayState.map((val, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                        <span className="text-[10px] text-slate-400">{val}</span>
                        <div
                          style={{ height: `${val * 1.3}px` }}
                          className={`w-full rounded-t transition-all duration-300 ${
                            idx === 0
                              ? 'bg-amber-400 shadow-md shadow-amber-400/20'
                              : 'bg-cyan-500 hover:bg-cyan-400'
                          }`}
                        />
                        <span className="text-[9px] text-slate-500">[{idx}]</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setArrayState([...arrayState].sort(() => Math.random() - 0.5))}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Shuffle Array
                  </button>
                  <span className="text-xs text-slate-500">Time Complexity: O(N log N)</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-slate-950 border border-slate-800/80 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                <pre>{codeSnippet}</pre>
              </div>
            )}

            {/* Teaching Explanation Summary Footer */}
            <div className="mt-6 border-t border-slate-800/60 pt-4 flex items-center justify-between text-xs text-slate-400">
              <p>Response latency: ~0.8s • Voice Lip-Sync Synchronized</p>
              <span className="text-emerald-400 font-medium">ElevenLabs & Web Speech Pipeline</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
