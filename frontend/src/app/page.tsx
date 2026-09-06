'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Play, Sparkles, Code2, BarChart3, Bot, Send } from 'lucide-react';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [question, setQuestion] = useState('');
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [arrayState, setArrayState] = useState([45, 23, 89, 12, 77, 34, 60]);

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    // Mock asking question
    setQuestion('');
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
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
          <div className="flex-1 min-h-[380px] rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 p-6 flex flex-col relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,rgba(6,182,212,0.15),transparent_70%)]" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  3D Interactive Avatar
                </span>
              </div>
              <span className="text-xs text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-800/40">
                Ready
              </span>
            </div>

            {/* Avatar Preview Area */}
            <div className="flex-1 flex flex-col items-center justify-center my-6 relative z-10 text-center">
              <div className="w-36 h-36 rounded-full border-2 border-cyan-500/40 bg-gradient-to-tr from-cyan-900/30 to-blue-900/30 flex items-center justify-center shadow-2xl shadow-cyan-500/20 relative group">
                <div
                  className="absolute inset-2 rounded-full border border-dashed border-cyan-400/30 animate-spin"
                  style={{ animationDuration: '15s' }}
                />
                <Bot className="w-16 h-16 text-cyan-300 transition-transform group-hover:scale-105 duration-300" />
              </div>
              <p className="mt-4 font-medium text-slate-200">Professor Ada</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Data Structures & Algorithms Expert • Voice-Driven Explanations
              </p>
            </div>

            {/* Voice Control Hub */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative z-10">
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
          </div>

          {/* Quick Questions Box */}
          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Or type a question (e.g., 'How does QuickSort choose a pivot?')..."
              className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 text-slate-200 placeholder-slate-500 transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
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
              Claude Generative Plan
            </span>
          </div>

          {/* Panel Content */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            {activeTab === 'visual' ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <div className="w-full max-w-lg mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400 font-medium">
                      QuickSort Execution State
                    </span>
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
                <pre>{`// QuickSort Python/JavaScript Implementation
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
}`}</pre>
              </div>
            )}

            {/* Teaching Explanation Summary Footer */}
            <div className="mt-6 border-t border-slate-800/60 pt-4 flex items-center justify-between text-xs text-slate-400">
              <p>Response latency: ~1.2s • Voice Lip-Sync Synchronized</p>
              <span className="text-emerald-400 font-medium">ElevenLabs Audio Cached</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
