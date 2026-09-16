'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Mic,
  MicOff,
  Play,
  Share2,
  Copy,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Send,
  MessageSquare,
  Sparkles,
  LayoutGrid,
  Layers,
  CodeXml,
  Network,
  Bell,
  LogOut,
  Search,
  Volume2,
  RotateCcw,
  Video,
} from 'lucide-react';
import { Sentiment } from '../components/Avatar/expressionController';
import { TimedPhoneme, generatePhonemesFromText } from '../components/Avatar/lipSyncController';
import { assemblyAiStream } from '../services/assemblyAiStream';

// Dynamically load the 3D Avatar canvas with zero SSR issues
const AvatarSection = dynamic(() => import('../components/Avatar/AvatarSection'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-slate-900/60 rounded-2xl border border-slate-800">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin mb-2" />
      <span className="text-xs text-slate-400">Initializing Anya 3D Rig...</span>
    </div>
  ),
});

// Default starting code in editor matching reference UI
const BST_DELETION_CODE = `# Binary Search Tree Deletion
class Node:
    def __init__(self, key):
        self.left = None
        self.right = None
        self.val = key

def deleteNode(root, key):
    if not root:
        return root
    
    if key < root.val:
        root.left = deleteNode(root.left, key)
    elif key > root.val:
        root.right = deleteNode(root.right, key)
    else:
        # Case 1 & 2: 0 or 1 child
        if not root.left:
            return root.right
        elif not root.right:
            return root.left
        
        # Case 3: 2 children - get inorder successor
        temp = minValueNode(root.right)
        root.val = temp.val
        root.right = deleteNode(root.right, temp.val)
        
    return root

def minValueNode(node):
    current = node
    while current.left is not None:
        current = current.left
    return current`;

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function DSALearnerPro() {
  // Navigation active tab
  const [activeNav, setActiveNav] = useState<'dashboard' | 'modules' | 'codelab' | 'visuals'>(
    'codelab'
  );

  // Input state
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Chat message history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'user',
      text: 'Hello, can you explain the Binary Search Tree & Algorithms?',
      timestamp: '10:42 AM',
    },
    {
      id: '2',
      sender: 'assistant',
      text: 'Anya - AI TA: Explaining the leaf node step, the BST deletes node 40! Watch the visualizer below.',
      timestamp: '10:42 AM',
    },
  ]);

  // Code editor state
  const [code, setCode] = useState(BST_DELETION_CODE);
  const [activeVisualMode, setActiveVisualMode] = useState<'both' | 'bst' | 'graph'>('both');

  // Algorithm Visualizer Interactive State
  const [deletedNode40, setDeletedNode40] = useState(false);
  const [activeBstHighlight, setActiveBstHighlight] = useState<number | null>(null);
  const [activeGraphEdge, setActiveGraphEdge] = useState<string | null>('A-E');
  const [visualStep, setVisualStep] = useState(1);

  // Avatar state
  const [sentiment, setSentiment] = useState<Sentiment>('explaining');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePhonemes, setActivePhonemes] = useState<TimedPhoneme[] | null>(null);
  const [spokenText, setSpokenText] = useState(
    'Welcome! Today we explore Binary Search Tree deletion and Dijkstra shortest path.'
  );

  // Waveform visualization animation
  const [waveHeights, setWaveHeights] = useState<number[]>(Array.from({ length: 48 }, () => 10));

  const onWordBoundaryRef = useRef<((word: string) => void) | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatBottomRef.current && typeof chatBottomRef.current.scrollIntoView === 'function') {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Live waveform animation when speaking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSpeaking) {
      interval = setInterval(() => {
        setWaveHeights(
          Array.from({ length: 48 }, (_, i) => {
            const centerFactor = 1 - Math.abs(i - 24) / 24;
            return Math.floor(Math.random() * 45 * centerFactor + 8);
          })
        );
      }, 70);
    } else {
      setWaveHeights(Array.from({ length: 48 }, () => 6));
    }
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Speech synthesis runner
  const speakStatement = (statementText: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeaking(true);
      setTimeout(
        () => {
          setIsSpeaking(false);
          setActivePhonemes(null);
          setSentiment('encouraging');
        },
        Math.min(10000, Math.max(2500, statementText.split(/\s+/).length * 300))
      );
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(statementText);
    activeUtteranceRef.current = utterance;
    (window as any).__activeUtterance = utterance;

    utterance.rate = 1.02;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Jenny') ||
            v.name.includes('Aria') ||
            v.name.includes('Samantha') ||
            v.name.includes('Zira'))
      ) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    if (naturalVoice) utterance.voice = naturalVoice;

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

    utterance.onerror = () => {
      setIsSpeaking(false);
      setActivePhonemes(null);
      setSentiment('idle');
      activeUtteranceRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  };

  // Submit question or prompt to backend
  const handleSend = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSentiment('thinking');
    setSpokenText(`Analyzing: "${q}"...`);

    // Check for interactive demo trigger phrases
    const qLower = q.toLowerCase();
    if (qLower.includes('delete') && (qLower.includes('40') || qLower.includes('bst'))) {
      executeDeleteNode40();
    } else if (
      qLower.includes('dijkstra') ||
      qLower.includes('graph') ||
      qLower.includes('shortest')
    ) {
      executeDijkstraDemo();
    }

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
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Anya - AI TA: ${answer}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setSpokenText(answer);
      setSentiment(data.mood || 'explaining');

      if (data.code?.snippet) {
        setCode(data.code.snippet);
      }

      const phonemes = generatePhonemesFromText(answer, 1.05);
      setActivePhonemes(phonemes);
      speakStatement(answer);
    } catch (err) {
      console.warn('Backend unavailable, using local pedagogical response:', err);

      let fallbackText = `To delete node 40 from the Binary Search Tree, we traverse from root 50 left to 30, then right to 40. Since 40 is a leaf node, we simply sever the parent pointer 30.right = null in O(log n) time!`;
      if (qLower.includes('dijkstra')) {
        fallbackText = `Dijkstra's algorithm finds the shortest path from A to F by greedily relaxing edge A to E (weight 2), then E to F (cost 2), achieving finalized minimum path cost 4 in O((V + E) log V) time.`;
      } else if (qLower.includes('quick')) {
        fallbackText = `QuickSort selects a pivot element, partitions smaller items left and greater items right, and recursively sorts subarrays in O(n log n) average time.`;
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Anya - AI TA: ${fallbackText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setSpokenText(fallbackText);
      setSentiment('explaining');

      const phonemes = generatePhonemesFromText(fallbackText, 1.05);
      setActivePhonemes(phonemes);
      speakStatement(fallbackText);
    }
  };

  // Interactive Action: Delete Node 40 Golden Demo
  const executeDeleteNode40 = () => {
    setActiveBstHighlight(50);
    setTimeout(() => {
      setActiveBstHighlight(30);
      setTimeout(() => {
        setActiveBstHighlight(40);
        setTimeout(() => {
          setDeletedNode40(true);
          setActiveBstHighlight(null);
        }, 900);
      }, 800);
    }, 800);
  };

  // Interactive Action: Dijkstra shortest path highlight
  const executeDijkstraDemo = () => {
    setActiveGraphEdge('A-E');
    setTimeout(() => {
      setActiveGraphEdge('E-F');
    }, 1200);
  };

  // Voice recording toggle via AssemblyAI stream with fallback
  const toggleRecording = () => {
    if (isRecording) {
      if (assemblyAiStream.getIsStreaming()) {
        assemblyAiStream.stop();
      }
      setIsRecording(false);
      return;
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'https://ai-teaching-assistant-backend-service.onrender.com';

    assemblyAiStream
      .start(backendUrl, {
        onPartialTranscript: (t) => setInputText(t),
        onFinalTranscript: (t) => {
          setInputText(t);
          setIsRecording(false);
          handleSend(t);
        },
        onStateChange: (streaming) => setIsRecording(streaming),
        onError: () => {
          // Browser speech fallback
          if (typeof window !== 'undefined') {
            const SpeechRecognition =
              (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
              const rec = new SpeechRecognition();
              rec.onresult = (e: any) => {
                const text = e.results[0][0].transcript;
                setInputText(text);
                handleSend(text);
              };
              rec.start();
              setIsRecording(true);
              return;
            }
          }
          setIsRecording(false);
        },
      })
      .then(() => setIsRecording(true))
      .catch(() => setIsRecording(false));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0e17] text-slate-200 font-sans select-none">
      {/* LEFT NAVIGATION SIDEBAR */}
      <aside className="w-16 md:w-20 bg-[#0d131f] border-r border-slate-800/80 flex flex-col items-center py-4 justify-between z-20 shrink-0">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Menu / Brand Logo Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 cursor-pointer">
            <Sparkles className="w-5 h-5" />
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col items-center gap-4 w-full pt-4">
            <button
              onClick={() => setActiveNav('dashboard')}
              title="Dashboard"
              className={`flex flex-col items-center gap-1 w-full py-2.5 transition-colors ${
                activeNav === 'dashboard'
                  ? 'text-cyan-400 border-l-2 border-cyan-400 bg-cyan-950/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="text-[10px]">Dashboard</span>
            </button>

            <button
              onClick={() => setActiveNav('modules')}
              title="Modules"
              className={`flex flex-col items-center gap-1 w-full py-2.5 transition-colors ${
                activeNav === 'modules'
                  ? 'text-cyan-400 border-l-2 border-cyan-400 bg-cyan-950/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-5 h-5" />
              <span className="text-[10px]">Modules</span>
            </button>

            <button
              onClick={() => setActiveNav('codelab')}
              title="Code Lab"
              className={`flex flex-col items-center gap-1 w-full py-2.5 transition-colors ${
                activeNav === 'codelab'
                  ? 'text-cyan-400 border-l-2 border-cyan-400 bg-cyan-950/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CodeXml className="w-5 h-5" />
              <span className="text-[10px] font-medium">Code Lab</span>
            </button>

            <button
              onClick={() => setActiveNav('visuals')}
              title="Visualizations"
              className={`flex flex-col items-center gap-1 w-full py-2.5 transition-colors ${
                activeNav === 'visuals'
                  ? 'text-cyan-400 border-l-2 border-cyan-400 bg-cyan-950/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-5 h-5" />
              <span className="text-[10px]">Visuals</span>
            </button>
          </nav>
        </div>

        {/* Bottom utility icons */}
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <button title="Notifications" className="hover:text-slate-200 p-2">
            <Bell className="w-5 h-5" />
          </button>
          <button title="Sign Out" className="hover:text-rose-400 p-2">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* MAIN APPLICATION CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* TOP HEADER BAR */}
        <header className="h-14 px-6 border-b border-slate-800/80 bg-[#0d131f]/90 backdrop-blur flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              DSA LEARNER
              <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
              <span className="sr-only">AI Teaching Assistant</span>
            </h1>

            {/* AssemblyAI Live Pipeline badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AssemblyAI Live Pipeline
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search topics (e.g. BST, Dijkstra)..."
                className="bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 w-52 md:w-64 focus:outline-none focus:border-cyan-500 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSend((e.target as HTMLInputElement).value);
                  }
                }}
              />
            </div>

            {/* Notification Badge */}
            <div className="relative p-1.5 text-slate-300 hover:text-white cursor-pointer">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            </div>

            {/* Profile pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                G
              </div>
              <span className="text-xs font-medium text-slate-300 hidden sm:inline">Gopal</span>
            </div>
          </div>
        </header>

        {/* 4-QUADRANT WORKSPACE GRID */}
        <main className="flex-1 p-3 md:p-4 grid grid-cols-1 lg:grid-cols-12 grid-rows-12 gap-3 md:gap-4 overflow-hidden">
          {/* ============================================================ */}
          {/* TOP-LEFT: CODE EDITOR (Cols 1-4, Rows 1-8) */}
          {/* ============================================================ */}
          <div className="lg:col-span-4 row-span-8 bg-[#111726] rounded-2xl border border-slate-800/90 flex flex-col overflow-hidden shadow-xl">
            {/* Window Header */}
            <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1422]">
              <span className="text-xs font-semibold text-slate-300 tracking-wide">
                Code Editor
              </span>
              <div className="flex items-center gap-2 text-slate-400">
                <button title="Share snippet" className="hover:text-slate-200 p-1">
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button
                  title="Copy Code"
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="hover:text-slate-200 p-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button title="Settings" className="hover:text-slate-200 p-1">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Code Body with line numbers */}
            <div className="flex-1 p-3 overflow-auto font-mono text-xs text-slate-300 flex">
              <div className="pr-3 text-right text-slate-600 select-none border-r border-slate-800/80 mr-3 leading-relaxed">
                {code.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="flex-1 bg-transparent border-none outline-none resize-none text-slate-200 leading-relaxed font-mono selection:bg-cyan-500/30"
              />
            </div>
          </div>

          {/* ============================================================ */}
          {/* TOP-MIDDLE: VISUALIZATION CANVAS (Cols 5-9, Rows 1-8) */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 row-span-8 bg-[#111726] rounded-2xl border border-slate-800/90 flex flex-col overflow-hidden shadow-xl">
            {/* Visualizer Controls Header */}
            <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1422]">
              <span className="text-xs font-semibold text-slate-300 tracking-wide">
                Visualization Canvas
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={executeDeleteNode40}
                  className="px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Run
                </button>
                <button
                  onClick={() => {
                    setDeletedNode40(false);
                    setActiveBstHighlight(null);
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
                <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                  <button
                    onClick={() => setVisualStep((s) => Math.max(1, s - 1))}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 text-xs flex items-center gap-0.5"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <button
                    onClick={() => setVisualStep((s) => s + 1)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 text-xs flex items-center gap-0.5"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Split Visual Canvas: BST on Left, Weighted Graph on Right */}
            <div className="flex-1 p-4 grid grid-cols-2 gap-4 relative overflow-hidden">
              {/* LEFT SUBPANEL: BINARY SEARCH TREE */}
              <div className="flex flex-col items-center justify-between border-r border-slate-800/80 pr-2">
                <h3 className="text-xs font-semibold text-slate-400 mb-2">
                  Binary Search Tree (BST)
                </h3>

                {/* BST SVG SVG Tree Structure */}
                <div className="flex-1 w-full flex items-center justify-center">
                  <svg viewBox="0 0 200 180" className="w-full max-w-[210px] h-auto">
                    {/* Connecting lines */}
                    <line x1="100" y1="30" x2="60" y2="75" stroke="#1e293b" strokeWidth="2.5" />
                    <line x1="100" y1="30" x2="140" y2="75" stroke="#1e293b" strokeWidth="2.5" />
                    <line x1="60" y1="75" x2="35" y2="120" stroke="#1e293b" strokeWidth="2.5" />
                    {!deletedNode40 && (
                      <line
                        x1="60"
                        y1="75"
                        x2="85"
                        y2="120"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                      />
                    )}
                    <line x1="140" y1="75" x2="115" y2="120" stroke="#1e293b" strokeWidth="2.5" />
                    <line x1="140" y1="75" x2="165" y2="120" stroke="#1e293b" strokeWidth="2.5" />
                    <line x1="115" y1="120" x2="140" y2="160" stroke="#1e293b" strokeWidth="2.5" />

                    {/* Root Node 50 */}
                    <circle
                      cx="100"
                      cy="30"
                      r="16"
                      className={`transition-all duration-300 ${
                        activeBstHighlight === 50
                          ? 'fill-cyan-500 stroke-white stroke-2 shadow-lg'
                          : 'fill-[#0b1329] stroke-cyan-500 stroke-2'
                      }`}
                    />
                    <text
                      x="100"
                      y="34"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      50
                    </text>

                    {/* Node 30 */}
                    <circle
                      cx="60"
                      cy="75"
                      r="14"
                      className={`transition-all duration-300 ${
                        activeBstHighlight === 30
                          ? 'fill-cyan-500 stroke-white stroke-2'
                          : 'fill-[#0b1329] stroke-cyan-400 stroke-2'
                      }`}
                    />
                    <text
                      x="60"
                      y="79"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      30
                    </text>

                    {/* Node 70 Right */}
                    <circle
                      cx="140"
                      cy="75"
                      r="14"
                      fill="#0b1329"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                    <text
                      x="140"
                      y="79"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      70
                    </text>

                    {/* Node 20 */}
                    <circle
                      cx="35"
                      cy="120"
                      r="12"
                      fill="#0b1329"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                    <text
                      x="35"
                      y="124"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      20
                    </text>

                    {/* Target Node 40 (Leaf to delete) */}
                    {!deletedNode40 ? (
                      <g className="transition-opacity duration-500">
                        <circle
                          cx="85"
                          cy="120"
                          r="13"
                          className={`transition-all duration-300 ${
                            activeBstHighlight === 40
                              ? 'fill-rose-500/80 stroke-rose-300 stroke-2 animate-pulse'
                              : 'fill-[#0b1329] stroke-cyan-400 stroke-2'
                          }`}
                        />
                        <text
                          x="85"
                          y="124"
                          textAnchor="middle"
                          fill="#e2e8f0"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          40
                        </text>
                      </g>
                    ) : (
                      <text
                        x="85"
                        y="124"
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="8"
                        fontStyle="italic"
                      >
                        [Deleted]
                      </text>
                    )}

                    {/* Node 70 (left child) */}
                    <circle
                      cx="115"
                      cy="120"
                      r="12"
                      fill="#0b1329"
                      stroke="#06b6d4"
                      strokeWidth="2"
                    />
                    <text
                      x="115"
                      y="124"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      70
                    </text>

                    {/* Node 60 */}
                    <circle
                      cx="165"
                      cy="120"
                      r="12"
                      fill="#0b1329"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                    <text
                      x="165"
                      y="124"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      60
                    </text>

                    {/* Node 80 */}
                    <circle
                      cx="140"
                      cy="160"
                      r="12"
                      fill="#0b1329"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                    <text
                      x="140"
                      y="164"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      80
                    </text>
                  </svg>
                </div>

                {/* Action Trigger Button */}
                <button
                  onClick={executeDeleteNode40}
                  className="mt-2 px-3 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 text-[11px] font-medium transition-all"
                >
                  Delete Node 40
                </button>
              </div>

              {/* RIGHT SUBPANEL: WEIGHTED GRAPH (DIJKSTRA) */}
              <div className="flex flex-col items-center justify-between pl-2">
                <h3 className="text-xs font-semibold text-slate-400 mb-2">Graph</h3>

                {/* Graph SVG Hexagonal Vertices A, B, C, D, E, F */}
                <div className="flex-1 w-full flex items-center justify-center">
                  <svg viewBox="0 0 200 180" className="w-full max-w-[210px] h-auto">
                    {/* Edges with weights */}
                    <line x1="100" y1="25" x2="40" y2="60" stroke="#1e293b" strokeWidth="2" />
                    <line
                      x1="100"
                      y1="25"
                      x2="160"
                      y2="60"
                      stroke={activeGraphEdge === 'A-C' ? '#06b6d4' : '#1e293b'}
                      strokeWidth={activeGraphEdge === 'A-C' ? '3' : '2'}
                    />
                    <text x="135" y="40" fill="#94a3b8" fontSize="9">
                      3
                    </text>

                    <line x1="40" y1="60" x2="40" y2="120" stroke="#1e293b" strokeWidth="2" />
                    <text x="30" y="93" fill="#94a3b8" fontSize="9">
                      2
                    </text>

                    <line
                      x1="160"
                      y1="60"
                      x2="160"
                      y2="120"
                      stroke={activeGraphEdge === 'E-F' ? '#10b981' : '#1e293b'}
                      strokeWidth={activeGraphEdge === 'E-F' ? '3' : '2'}
                    />
                    <text x="166" y="93" fill="#94a3b8" fontSize="9">
                      4
                    </text>

                    {/* Diagonal path A-E (cost 2) */}
                    <line
                      x1="100"
                      y1="25"
                      x2="100"
                      y2="155"
                      stroke={activeGraphEdge === 'A-E' ? '#06b6d4' : '#1e293b'}
                      strokeWidth={activeGraphEdge === 'A-E' ? '3' : '2'}
                    />
                    <text x="104" y="90" fill="#38bdf8" fontSize="9" fontWeight="bold">
                      2
                    </text>

                    {/* Edge B-C */}
                    <line x1="40" y1="60" x2="160" y2="60" stroke="#1e293b" strokeWidth="1.5" />
                    <text x="95" y="55" fill="#64748b" fontSize="8">
                      6
                    </text>

                    {/* Edge B-E */}
                    <line x1="40" y1="60" x2="100" y2="155" stroke="#1e293b" strokeWidth="1.5" />
                    <text x="73" y="112" fill="#64748b" fontSize="8">
                      2
                    </text>

                    {/* Edge D-E */}
                    <line x1="40" y1="120" x2="100" y2="155" stroke="#06b6d4" strokeWidth="2.5" />
                    <text x="65" y="145" fill="#94a3b8" fontSize="9">
                      3
                    </text>

                    {/* Edge E-F */}
                    <line x1="100" y1="155" x2="160" y2="120" stroke="#10b981" strokeWidth="2.5" />

                    {/* Vertex Nodes A, B, C, D, E, F */}
                    {/* A */}
                    <circle
                      cx="100"
                      cy="25"
                      r="14"
                      fill="#0b1329"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                    />
                    <text
                      x="100"
                      y="29"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      A
                    </text>

                    {/* B */}
                    <circle
                      cx="40"
                      cy="60"
                      r="12"
                      fill="#0b1329"
                      stroke="#475569"
                      strokeWidth="1.5"
                    />
                    <text
                      x="40"
                      y="64"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      B
                    </text>

                    {/* C */}
                    <circle
                      cx="160"
                      cy="60"
                      r="13"
                      fill="#0b1329"
                      stroke="#06b6d4"
                      strokeWidth="2"
                    />
                    <text
                      x="160"
                      y="64"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      C
                    </text>

                    {/* D */}
                    <circle
                      cx="40"
                      cy="120"
                      r="12"
                      fill="#0b1329"
                      stroke="#475569"
                      strokeWidth="1.5"
                    />
                    <text
                      x="40"
                      y="124"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      D
                    </text>

                    {/* E */}
                    <circle
                      cx="100"
                      cy="155"
                      r="14"
                      fill="#0b1329"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                    />
                    <text
                      x="100"
                      y="159"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      E
                    </text>

                    {/* F (Destination) */}
                    <circle
                      cx="160"
                      cy="120"
                      r="13"
                      fill="#0b1329"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />
                    <text
                      x="160"
                      y="124"
                      textAnchor="middle"
                      fill="#10b981"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      F
                    </text>
                  </svg>
                </div>

                {/* Dijkstra Trigger Button */}
                <button
                  onClick={executeDijkstraDemo}
                  className="mt-2 px-3 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 text-[11px] font-medium transition-all"
                >
                  Dijkstra Path (A → E → F)
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* TOP-RIGHT: 3D AVATAR (ANYA - AI TA) (Cols 10-12, Rows 1-8) */}
          {/* ============================================================ */}
          <div className="lg:col-span-3 row-span-8 bg-[#111726] rounded-2xl border border-slate-800/90 flex flex-col overflow-hidden shadow-xl relative">
            {/* Header with Active Speech Indicator */}
            <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1422]">
              <span className="text-xs font-semibold text-slate-300 tracking-wide">
                ANYA - AI TA
              </span>
              <div className="flex items-center gap-2">
                <button className="text-slate-400 hover:text-slate-200">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Avatar 3D Viewport */}
            <div className="flex-1 relative bg-gradient-to-b from-[#0b101d] via-[#10182b] to-[#0a0f1d] flex items-center justify-center overflow-hidden">
              {/* Active Speech Green Badge */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 backdrop-blur text-[10px] font-medium text-emerald-400">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-600'
                  }`}
                />
                ACTIVE SPEECH
              </div>

              {/* Student Video Thumbnail Overlay (Top-Right) */}
              <div className="absolute top-3 right-3 z-10 w-9 h-9 rounded-lg border border-slate-700 bg-slate-800/90 overflow-hidden shadow flex items-center justify-center text-slate-400">
                <Video className="w-4 h-4" />
              </div>

              {/* Three.js 3D Avatar Rendering Rig */}
              <div className="w-full h-full">
                <AvatarSection
                  currentSentiment={sentiment}
                  isListening={isRecording}
                  isSpeaking={isSpeaking}
                  activePhonemes={activePhonemes}
                  spokenText={spokenText}
                  onWordBoundaryRef={onWordBoundaryRef}
                  onSentimentChange={setSentiment}
                />
              </div>

              {/* Bottom Avatar Info Strip */}
              <div className="absolute bottom-3 left-3 right-3 z-10 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80 backdrop-blur flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-200">ANYA - AI TA</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* BOTTOM-LEFT: AI ASSISTANT CHAT (Cols 1-4, Rows 9-12) */}
          {/* ============================================================ */}
          <div className="lg:col-span-4 row-span-4 bg-[#111726] rounded-2xl border border-slate-800/90 flex flex-col overflow-hidden shadow-xl">
            {/* Header */}
            <div className="h-9 px-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1422]">
              <span className="text-xs font-semibold text-slate-300 tracking-wide flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                AI ASSISTANT CHAT
              </span>
              <button className="text-slate-400 hover:text-slate-200">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat message bubbles */}
            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-start' : 'items-start pl-3'
                  }`}
                >
                  <div
                    className={`max-w-[92%] rounded-xl px-3 py-2 leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#1a2336] text-slate-200 border border-slate-700/60'
                        : 'bg-cyan-950/30 text-cyan-200 border border-cyan-800/40'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Box with Send Button */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(inputText);
              }}
              className="p-2 border-t border-slate-800/80 bg-[#0d131f] flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-[#141b2a] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="submit"
                className="p-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* ============================================================ */}
          {/* BOTTOM-RIGHT: ANYA'S EXPLANATION & LIVE AUDIO WAVEFORM (Cols 5-12, Rows 9-12) */}
          {/* ============================================================ */}
          <div className="lg:col-span-8 row-span-4 bg-[#111726] rounded-2xl border border-slate-800/90 flex flex-col overflow-hidden shadow-xl">
            {/* Header with Expand Controls */}
            <div className="h-9 px-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1422]">
              <span className="text-xs font-semibold text-slate-300 tracking-wide flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                Anya&apos;s Explanation (Live)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleRecording}
                  title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-3 h-3" />
                  ) : (
                    <Mic className="w-3 h-3 text-cyan-400" />
                  )}
                  {isRecording ? 'Listening...' : 'Voice Query'}
                </button>
                <button className="text-slate-400 hover:text-slate-200">
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Audio Waveform Canvas */}
            <div className="flex-1 px-6 py-4 flex flex-col justify-center items-center relative bg-gradient-to-r from-[#0d1424] via-[#0f172a] to-[#0d1424]">
              {/* Dynamic Cyan Waveform Bars */}
              <div className="w-full max-w-2xl h-16 flex items-center justify-center gap-1">
                {waveHeights.map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}px` }}
                    className="w-1.5 rounded-full bg-gradient-to-t from-cyan-600 to-cyan-300 shadow-sm shadow-cyan-500/30 transition-all duration-75"
                  />
                ))}
              </div>

              {/* Spoken Explanation Caption */}
              <p className="mt-3 text-center text-xs text-slate-300 max-w-xl line-clamp-2 italic">
                &ldquo;{spokenText}&rdquo;
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
