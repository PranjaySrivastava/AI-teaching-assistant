'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Code2,
  Eye,
  Activity,
  Layers,
  Sparkles,
  BookOpen,
  Search,
  CheckCircle2,
  Terminal,
  Volume2,
  VolumeX,
  Send,
  Mic,
  MicOff,
  Copy,
  Check,
  RotateCcw,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Flame,
  Shield,
  HelpCircle,
  ExternalLink,
  SplitSquareVertical,
  Cpu,
  BarChart3,
  Compass,
  ArrowRight,
} from 'lucide-react';
import rawTopicsData from '../data/topics.json';
import { Sentiment } from '../components/Avatar/expressionController';
import { assemblyAiStream } from '../services/assemblyAiStream';

// Dynamic import of 3D AvatarSection to avoid SSR issues with Three.js
const AvatarSection = dynamic(() => import('../components/Avatar/AvatarSection'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
      <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      <span className="text-xs font-mono text-cyan-400/80">Initializing 3D Neural Avatar...</span>
    </div>
  ),
});

// Category Metadata with Emojis, Labels, and Theme Badges
const CATEGORY_META: Record<
  string,
  { label: string; icon: string; bg: string; border: string; text: string }
> = {
  arrays: {
    label: 'Arrays',
    icon: '📦',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  'linked-list': {
    label: 'Linked Lists',
    icon: '🔗',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  'stack-queue': {
    label: 'Stacks & Queues',
    icon: '📚',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
  searching: {
    label: 'Searching & Binary Search',
    icon: '🔍',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
  },
  trees: {
    label: 'Trees & BST',
    icon: '🌳',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
  },
  hashing: {
    label: 'Hashing & Hash Maps',
    icon: '#️⃣',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    text: 'text-pink-400',
  },
  sorting: {
    label: 'Sorting Algorithms',
    icon: '⚙️',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
  },
  heap: {
    label: 'Heap & Priority Queue',
    icon: '⛰️',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
  },
  'bit-manipulation': {
    label: 'Bit Manipulation',
    icon: '🔢',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
  },
  graphs: {
    label: 'Graph Algorithms',
    icon: '🕸️',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
  },
  'dynamic-programming': {
    label: 'Dynamic Programming',
    icon: '💡',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
  },
  strings: {
    label: 'String Manipulation',
    icon: '🔤',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    text: 'text-teal-400',
  },
  greedy: {
    label: 'Greedy Algorithms',
    icon: '💰',
    bg: 'bg-lime-500/10',
    border: 'border-lime-500/30',
    text: 'text-lime-400',
  },
  backtracking: {
    label: 'Backtracking & Recursion',
    icon: '🔄',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
  },
  matrix: {
    label: 'Matrix & 2D Grids',
    icon: '🗺️',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
  },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-emerald-400 bg-emerald-950/40 border-emerald-700/40',
  medium: 'text-amber-400 bg-amber-950/40 border-amber-700/40',
  hard: 'text-rose-400 bg-rose-950/40 border-rose-700/40',
};

// Title Case formatter: capitalized first letters for all major English words
function toTitleCase(rawTitle: string): string {
  if (!rawTitle) return '';
  const stripped = rawTitle.replace(/^(\d+[\.\s-]*)+/, '').trim();
  const minorWords = new Set([
    'a',
    'an',
    'and',
    'as',
    'at',
    'but',
    'by',
    'for',
    'in',
    'nor',
    'of',
    'on',
    'or',
    'so',
    'the',
    'to',
    'up',
    'yet',
    'with',
  ]);
  const acronyms = new Set([
    'BST',
    'LCA',
    'BFS',
    'DFS',
    'LRU',
    'DP',
    'LIS',
    'LCS',
    'KMP',
    'II',
    'III',
    'IV',
    'V',
  ]);
  return stripped
    .split(/[\s_-]+/)
    .map((word, idx) => {
      const upper = word.toUpperCase();
      if (acronyms.has(upper)) return upper;
      const lower = word.toLowerCase();
      if (idx !== 0 && minorWords.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

interface VisualStep {
  action: string;
  description: string;
}

interface TopicItem {
  id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  title: string;
  question?: string;
  expectedAnswer?: {
    timeComplexity?: any;
    spaceComplexity?: any;
    explanation?: string;
  };
  visualScript?: {
    type?: string;
    description?: string;
    steps?: VisualStep[];
  };
  codeReferences?: {
    python?: string;
    javascript?: string;
    cpp?: string;
    java?: string;
  };
}

function getTc(topic?: TopicItem): string {
  if (!topic?.expectedAnswer?.timeComplexity) return 'O(N)';
  const tc = topic.expectedAnswer.timeComplexity;
  if (typeof tc === 'string') return tc;
  return tc.average || tc.worst || 'O(N)';
}

function getSc(topic?: TopicItem): string {
  if (!topic?.expectedAnswer?.spaceComplexity) return 'O(1)';
  const sc = topic.expectedAnswer.spaceComplexity;
  if (typeof sc === 'string') return sc;
  return 'O(1)';
}

export interface VisualStepModel {
  step: number;
  action: string;
  description: string;
  spokenLecture: string;
  highlightIndices?: number[];
  pointerIndex?: number;
  low?: number;
  mid?: number;
  high?: number;
  target?: number;
  currentVal?: number | string;
  complement?: number;
  hashMap?: Record<number, number>;
  arrayState?: number[];
  activeNode?: string;
  swapping?: [number, number];
  found?: boolean;
}

export interface AlgorithmVisualModel {
  type: 'hashmap' | 'binary_search' | 'sorting' | 'tree' | 'linked_list' | 'array_general';
  title: string;
  target?: number;
  initialArray?: number[];
  steps: VisualStepModel[];
}

function getAlgorithmVisualization(topic: TopicItem): AlgorithmVisualModel {
  const normTitle = (topic.title || '').toLowerCase();
  const normId = (topic.id || '').toLowerCase();
  const category = (topic.category || '').toLowerCase();

  // 1. TWO SUM / HASH MAP SEARCH
  if (normId.includes('two-sum') || normTitle.includes('two sum')) {
    return {
      type: 'hashmap',
      title: 'Two Sum with O(1) Hash Map Lookup',
      target: 9,
      initialArray: [2, 7, 11, 15],
      steps: [
        {
          step: 1,
          action: 'Initialize Hash Map',
          description:
            'Target = 9, array = [2, 7, 11, 15]. Initialize an empty hash map to store visited numbers and their indices.',
          spokenLecture:
            'We are solving Two Sum for target nine with input array two, seven, eleven, fifteen. We initialize an empty hash map to record each visited number and its index in O of one time.',
          pointerIndex: 0,
          currentVal: 2,
          target: 9,
          complement: 7,
          hashMap: {},
        },
        {
          step: 2,
          action: 'Inspect Index 0 (Val: 2)',
          description:
            'nums[0] = 2. Required complement = 9 - 2 = 7. 7 is NOT in hash map -> Record {2: 0} and advance pointer to index 1.',
          spokenLecture:
            'At index zero, our current value is two. The complement we need is nine minus two, which is seven. Seven is not yet in our hash map, so we record key two at index zero and move forward.',
          pointerIndex: 0,
          currentVal: 2,
          target: 9,
          complement: 7,
          hashMap: { 2: 0 },
        },
        {
          step: 3,
          action: 'Inspect Index 1 (Val: 7) - Match Found!',
          description:
            'nums[1] = 7. Required complement = 9 - 7 = 2. Key 2 IS found in hash map at index 0! Pair identified: indices [0, 1].',
          spokenLecture:
            'At index one, our current value is seven. Nine minus seven gives two. We check the hash map, and two was previously stored at index zero! We have found the matching pair.',
          pointerIndex: 1,
          currentVal: 7,
          target: 9,
          complement: 2,
          hashMap: { 2: 0 },
          highlightIndices: [0, 1],
          found: true,
        },
        {
          step: 4,
          action: 'Return Solution Indices [0, 1]',
          description:
            'Return indices [0, 1]. Total Time Complexity: O(n) using a single pass; Auxiliary Space: O(n) for the hash map.',
          spokenLecture:
            'We return indices zero and one. Using the hash map, we solved Two Sum in optimal linear O of n time, avoiding the brute force quadratic search.',
          pointerIndex: 1,
          currentVal: 7,
          target: 9,
          complement: 2,
          hashMap: { 2: 0, 7: 1 },
          highlightIndices: [0, 1],
          found: true,
        },
      ],
    };
  }

  // 2. BINARY SEARCH / SEARCHING
  if (
    category === 'binary-search' ||
    normId.includes('binary-search') ||
    normTitle.includes('binary search') ||
    normTitle.includes('search insert')
  ) {
    const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
    return {
      type: 'binary_search',
      title: 'Binary Search on Sorted Array',
      target: 23,
      initialArray: arr,
      steps: [
        {
          step: 1,
          action: 'Initialize Pointers & Compute Mid',
          description:
            'Sorted Array of 10 elements. Target = 23. Set Low = 0 (val: 2), High = 9 (val: 91). Mid = (0 + 9) / 2 = 4 (val: 16).',
          spokenLecture:
            'To search for target twenty-three in a sorted array, we set pointer low at index zero, high at index nine, and compute middle index four, which contains sixteen.',
          low: 0,
          mid: 4,
          high: 9,
          target: 23,
          currentVal: 16,
          arrayState: arr,
        },
        {
          step: 2,
          action: 'Compare Target with Mid (23 > 16)',
          description:
            'Target 23 > nums[mid] 16. Since array is sorted, discard left half [0..4]. Set Low = mid + 1 = 5.',
          spokenLecture:
            'Our target twenty-three is greater than sixteen. Because the array is strictly sorted, the target cannot exist in the left half. We prune the left half and update low to index five.',
          low: 5,
          mid: 4,
          high: 9,
          target: 23,
          currentVal: 16,
          arrayState: arr,
        },
        {
          step: 3,
          action: 'Recalculate Middle Pointer',
          description:
            'Active search range is [5..9]. Low = 5 (val: 23), High = 9 (val: 91). New Mid = (5 + 9) / 2 = 7 (val: 56).',
          spokenLecture:
            'Our search window is now index five through nine. Five plus nine divided by two gives middle index seven, where the value is fifty-six.',
          low: 5,
          mid: 7,
          high: 9,
          target: 23,
          currentVal: 56,
          arrayState: arr,
        },
        {
          step: 4,
          action: 'Compare Target with Mid (23 < 56)',
          description:
            'Target 23 < nums[mid] 56. Discard right half [7..9]. Set High = mid - 1 = 6.',
          spokenLecture:
            'Target twenty-three is less than fifty-six. We discard the right partition and update high to index six.',
          low: 5,
          mid: 7,
          high: 6,
          target: 23,
          currentVal: 56,
          arrayState: arr,
        },
        {
          step: 5,
          action: 'Match Found at Index 5!',
          description:
            'Active search range is [5..6]. Mid = (5 + 6) / 2 = 5 (val: 23). nums[mid] == 23! Target found in O(log n) time.',
          spokenLecture:
            'Now low is five and high is six. The new midpoint is index five, where the value is exactly twenty-three! Target found in logarithmic O of log n time.',
          low: 5,
          mid: 5,
          high: 6,
          target: 23,
          currentVal: 23,
          found: true,
          highlightIndices: [5],
          arrayState: arr,
        },
      ],
    };
  }

  // 3. SORTING / QUICKSORT / MERGESORT / BUBBLESORT
  if (category === 'sorting' || normId.includes('sort') || normTitle.includes('sort')) {
    return {
      type: 'sorting',
      title: 'QuickSort Partitioning & Sorting Walkthrough',
      initialArray: [38, 27, 43, 3, 9, 82, 10],
      steps: [
        {
          step: 1,
          action: 'Select Pivot Element',
          description:
            'Array: [38, 27, 43, 3, 9, 82, 10]. Select last element (10) as pivot. Elements smaller than 10 will move left.',
          spokenLecture:
            'For QuickSort partitioning, we select the last element, ten, as our pivot. All elements smaller than ten will move left, and larger elements will move right.',
          arrayState: [38, 27, 43, 3, 9, 82, 10],
          pointerIndex: 6,
          currentVal: 10,
        },
        {
          step: 2,
          action: 'Scan & Compare Against Pivot',
          description:
            'Compare element 38 with pivot 10 (38 > 10). Element 38 belongs on right. Advance scanner to index 3 (val: 3).',
          spokenLecture:
            'We scan the array. Thirty-eight is greater than ten, so it belongs in the right partition. At index three, element three is less than or equal to ten.',
          arrayState: [38, 27, 43, 3, 9, 82, 10],
          highlightIndices: [0, 3],
          currentVal: 3,
        },
        {
          step: 3,
          action: 'Swap Smaller Element Left',
          description:
            'Swap 38 (index 0) and 3 (index 3). Smaller element moves left: [3, 27, 43, 38, 9, 82, 10].',
          spokenLecture:
            'We swap thirty-eight with three to move the smaller element to the left side of the partition.',
          arrayState: [3, 27, 43, 38, 9, 82, 10],
          swapping: [0, 3],
          highlightIndices: [0, 3],
        },
        {
          step: 4,
          action: 'Place Pivot into Partition Boundary',
          description:
            'Swap pivot 10 into sorted boundary: [3, 9, 10, 38, 27, 82, 43]. Pivot 10 is permanently sorted!',
          spokenLecture:
            'We place pivot ten into its final sorted position between the partitions. Ten will never need to move again.',
          arrayState: [3, 9, 10, 38, 27, 82, 43],
          highlightIndices: [2],
          found: true,
        },
        {
          step: 5,
          action: 'Recursive Sort Complete',
          description:
            'Recursively sort left partition [3, 9] and right partition [27, 38, 43, 82]. Final array sorted in O(n log n) average time.',
          spokenLecture:
            'The array is partitioned around ten. We recursively sort the partitions, completing the sort in average O of n log n time.',
          arrayState: [3, 9, 10, 27, 38, 43, 82],
          highlightIndices: [0, 1, 2, 3, 4, 5, 6],
          found: true,
        },
      ],
    };
  }

  // 4. TREES / BST
  if (
    category === 'trees' ||
    normId.includes('tree') ||
    normTitle.includes('tree') ||
    normTitle.includes('bst')
  ) {
    return {
      type: 'tree',
      title: 'Binary Search Tree Traversal & Search',
      target: 40,
      steps: [
        {
          step: 1,
          action: 'Inspect Root Node (50)',
          description:
            'Searching for target 40 in BST. Root value is 50. Since 40 < 50, branch to left child (30).',
          spokenLecture:
            'We search for value forty in the Binary Search Tree. At root fifty, forty is strictly less than fifty, so according to BST invariants, we branch left.',
          activeNode: '50',
          currentVal: 50,
          target: 40,
        },
        {
          step: 2,
          action: 'Inspect Left Child (30)',
          description: 'Current node is 30. Since 40 > 30, branch to right child (40).',
          spokenLecture:
            'Now at node thirty, forty is greater than thirty. By BST properties, greater values reside in the right sub-tree, so we branch right.',
          activeNode: '30',
          currentVal: 30,
          target: 40,
        },
        {
          step: 3,
          action: 'Target Node 40 Found!',
          description:
            'Current node is 40. Node value equals target! Search completed successfully in O(h) = O(log n) time.',
          spokenLecture:
            'Current node matches our target forty! The search terminates successfully in logarithmic O of height time.',
          activeNode: '40',
          currentVal: 40,
          target: 40,
          found: true,
        },
      ],
    };
  }

  // 5. LINKED LISTS
  if (
    category === 'linked-list' ||
    normId.includes('linked-list') ||
    normTitle.includes('linked list') ||
    normTitle.includes('reverse list')
  ) {
    return {
      type: 'linked_list',
      title: 'Linked List Reversal & Traversal',
      steps: [
        {
          step: 1,
          action: 'Initialize Pointers (prev, curr, next)',
          description:
            'List: 1 -> 2 -> 3 -> 4 -> 5 -> NULL. Initialize Prev = NULL, Curr = Node(1), Next = Node(2).',
          spokenLecture:
            'To reverse a singly linked list in linear time, we maintain three pointers: previous initialized to null, current pointing to head node one, and next pointing to node two.',
          pointerIndex: 0,
          currentVal: 1,
        },
        {
          step: 2,
          action: 'Reverse Pointer 1 -> Prev',
          description:
            'Save curr.next (2). Point Node(1).next to Prev (NULL). Advance Prev = 1, Curr = 2.',
          spokenLecture:
            'We store the next pointer, redirect node one next pointer backwards to previous, and advance our pointers forward.',
          pointerIndex: 1,
          currentVal: 2,
        },
        {
          step: 3,
          action: 'Reverse Pointer 2 -> 1',
          description:
            'Point Node(2).next to Node(1). List is now NULL <- 1 <- 2. Advance Prev = 2, Curr = 3.',
          spokenLecture:
            'Node two is now redirected backwards to node one, and we advance our pointers forward to node three.',
          pointerIndex: 2,
          currentVal: 3,
        },
        {
          step: 4,
          action: 'Complete In-Place Reversal',
          description:
            'Repeat until Curr == NULL. New head is Node(5). Reversed: 5 -> 4 -> 3 -> 2 -> 1 -> NULL.',
          spokenLecture:
            'We repeat this operation for all nodes until current is null. Node five is our new head. Time complexity is O of n with O of one in-place auxiliary space.',
          pointerIndex: 4,
          currentVal: 5,
          found: true,
        },
      ],
    };
  }

  // 6. DYNAMIC CONTEXTUAL GENERATOR FOR ALL OTHER PROBLEMS
  const cleanTitle = toTitleCase(topic.title);
  const tc = getTc(topic);
  const sc = getSc(topic);
  const summary =
    topic.expectedAnswer?.summary || 'Optimized state transitions across the input structure.';

  return {
    type: 'array_general',
    title: `${cleanTitle} Execution Walkthrough`,
    initialArray: [7, 1, 5, 3, 6, 4],
    steps: [
      {
        step: 1,
        action: `Initialize ${cleanTitle} State`,
        description: `Set up tracking variables and invariants. Target complexity: Time ${tc}, Space ${sc}.`,
        spokenLecture: `We begin the walkthrough for ${cleanTitle}. We set up our tracking pointers and invariant state to guarantee asymptotic time complexity of ${tc}.`,
        pointerIndex: 0,
        currentVal: 7,
      },
      {
        step: 2,
        action: 'Scan Elements & Evaluate Condition',
        description: `Inspect element at index 1 (val: 1). Compare with previous state and evaluate transition: ${summary.slice(0, 80)}...`,
        spokenLecture: `At index one, we evaluate the current element and update our running invariant according to the algorithm's optimal criteria.`,
        pointerIndex: 1,
        currentVal: 1,
        highlightIndices: [0, 1],
      },
      {
        step: 3,
        action: 'Update Optimal State & Bounds',
        description: `At index 4 (val: 6), invariant condition is satisfied. Update best result and advance window.`,
        spokenLecture: `Scanning through the elements, at index four our invariant reaches an optimal threshold. We update our result variable and continue advancing.`,
        pointerIndex: 4,
        currentVal: 6,
        highlightIndices: [1, 4],
        found: true,
      },
      {
        step: 4,
        action: 'Finalize & Return Result',
        description: `All elements evaluated in one pass. Return computed result with optimal time ${tc} and space ${sc}.`,
        spokenLecture: `All elements have been processed in a single pass. The algorithm returns the verified optimal result, achieving time complexity of ${tc} and space ${sc}.`,
        pointerIndex: 5,
        currentVal: 4,
        found: true,
      },
    ],
  };
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  mood?: Sentiment;
}

export default function Home() {
  const allTopics = useMemo<TopicItem[]>(() => rawTopicsData as unknown as TopicItem[], []);

  // Navigation State
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'modules' | 'codelab'>('dashboard');

  // Topic Selection
  const [selectedTopicId, setSelectedTopicId] = useState<string>(allTopics[0]?.id || '001-two-sum');
  const selectedTopic = useMemo<TopicItem>(() => {
    return allTopics.find((t) => t.id === selectedTopicId) || allTopics[0];
  }, [allTopics, selectedTopicId]);

  // Code Lab View Mode: Single Tab vs Split View
  const [activeTab, setActiveTab] = useState<'code' | 'visualization' | 'complexity'>('code');
  const [isSplitView, setIsSplitView] = useState<boolean>(false);
  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage for code in split view
  const [codeLang, setCodeLang] = useState<'python' | 'cpp' | 'java'>('python');
  const [codeText, setCodeText] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);

  // Visualization Player State
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlayingVis, setIsPlayingVis] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  // Avatar & Speech State
  const [sentiment, setSentiment] = useState<Sentiment>('idle');
  const [spokenText, setSpokenText] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const onWordBoundaryRef = useRef<((word: string) => void) | null>(null);

  // Permanent ElevenLabs Neural Voice Configuration (ID: ZBagl2bR5Xv44f5Xpxn6)
  const ELEVENLABS_VOICE_ID = 'ZBagl2bR5Xv44f5Xpxn6';
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am Professor Ada, your interactive DS&A Teaching Assistant. Select any topic to analyze code, step through visualizations, or ask me any question!',
      timestamp: 'Just now',
      mood: 'encouraging',
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Speech Helper (TTS with ElevenLabs Cloud Neural Voice + Web Speech Fallback)
  const speakText = useCallback(
    async (textToSpeak: string, onEnd?: () => void) => {
      if (!isTtsEnabled || typeof window === 'undefined') {
        onEnd?.();
        return;
      }

      // Stop any prior speech or audio playback
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }

      setSpokenText(textToSpeak);
      setIsSpeaking(true);
      setSentiment('explaining');

      // Web Speech synthesis execution helper
      const fallbackToWebSpeech = () => {
        if (!('speechSynthesis' in window)) {
          setIsSpeaking(false);
          setSpokenText('');
          setSentiment('idle');
          onEnd?.();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = playbackSpeed === 0.5 ? 0.9 : playbackSpeed === 2 ? 1.25 : 1.05;
        utterance.pitch = 1.05;

        const voices = window.speechSynthesis.getVoices();
        const chosenVoice =
          voices.find(
            (v) =>
              v.lang === 'en-IN' ||
              v.lang.startsWith('en_IN') ||
              v.lang.startsWith('en-IN') ||
              v.name.includes('India') ||
              v.name.includes('Heera') ||
              v.name.includes('Neerja') ||
              v.name.includes('Veena')
          ) ||
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Natural') ||
                v.name.includes('Jenny') ||
                v.name.includes('Zira') ||
                v.name.includes('Samantha') ||
                v.name.includes('Aria') ||
                v.name.includes('Google'))
          ) ||
          voices[0];
        if (chosenVoice) utterance.voice = chosenVoice;

        utterance.onboundary = (ev) => {
          if (ev.name === 'word') {
            const remainder = textToSpeak.slice(ev.charIndex);
            const match = remainder.match(/^[\w']+/);
            const word = match ? match[0] : '';
            if (word && onWordBoundaryRef.current) onWordBoundaryRef.current(word);
          }
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setSpokenText('');
          setSentiment('idle');
          onEnd?.();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setSpokenText('');
          setSentiment('idle');
          onEnd?.();
        };

        window.speechSynthesis.speak(utterance);
      };

      // 1. ElevenLabs Cloud Neural Voice (Permanent Voice ID: ZBagl2bR5Xv44f5Xpxn6)
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const ttsRes = await fetch(`${backendUrl}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToSpeak, voiceId: ELEVENLABS_VOICE_ID }),
        });

        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          if (ttsData.audioUrl && ttsData.audioUrl.startsWith('data:audio/')) {
            const audio = new Audio(ttsData.audioUrl);
            activeAudioRef.current = audio;

            const words = textToSpeak.split(/\s+/);
            let wordIdx = 0;
            const wordInterval = setInterval(() => {
              if (wordIdx < words.length && onWordBoundaryRef.current) {
                onWordBoundaryRef.current(words[wordIdx]);
                wordIdx++;
              } else {
                clearInterval(wordInterval);
              }
            }, 250);

            audio.onended = () => {
              clearInterval(wordInterval);
              activeAudioRef.current = null;
              setIsSpeaking(false);
              setSpokenText('');
              setSentiment('idle');
              onEnd?.();
            };

            audio.onerror = () => {
              clearInterval(wordInterval);
              activeAudioRef.current = null;
              fallbackToWebSpeech();
            };

            await audio.play();
            return;
          }
        }
      } catch {
        // Backend or network error, fallback cleanly to local Web Speech
      }

      // 2. Fallback: Web Speech synthesis
      fallbackToWebSpeech();
    },
    [isTtsEnabled, playbackSpeed]
  );

  // Sync isPlayingVis ref for async callbacks
  const isPlayingVisRef = useRef<boolean>(isPlayingVis);
  useEffect(() => {
    isPlayingVisRef.current = isPlayingVis;
  }, [isPlayingVis]);

  // Toggle Visualization Play/Pause with Speech Sync
  const handleTogglePlayVis = useCallback(() => {
    if (isPlayingVis) {
      setIsPlayingVis(false);
      isPlayingVisRef.current = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      setSentiment('idle');
    } else {
      setIsPlayingVis(true);
      isPlayingVisRef.current = true;
    }
  }, [isPlayingVis]);

  // Reset Visualization with Speech Cancel
  const handleResetVis = useCallback(() => {
    setIsPlayingVis(false);
    isPlayingVisRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSentiment('idle');
    setCurrentStepIdx(0);
  }, []);

  // Narrate individual step on demand with authentic pedagogical speech
  const handleNarrateStep = useCallback(
    (stepIdx: number) => {
      const vizModel = getAlgorithmVisualization(selectedTopic);
      const steps = vizModel.steps;
      const step = steps[stepIdx];
      if (!step) return;
      const narration = step.spokenLecture || step.description;
      setSentiment('explaining');
      speakText(narration);
    },
    [selectedTopic, speakText]
  );

  // Sync Code Text when topic or language changes
  useEffect(() => {
    if (selectedTopic?.codeReferences) {
      setCodeText(selectedTopic.codeReferences[codeLang] || '# No code available');
      setRunOutput(null);
      setCurrentStepIdx(0);
      setIsPlayingVis(false);
      isPlayingVisRef.current = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      setSentiment('idle');
    }
  }, [selectedTopic, codeLang]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isSendingChat]);

  // Step Auto-Player with Professor Ada Speech Lecture
  useEffect(() => {
    if (!isPlayingVis) return;

    const vizModel = getAlgorithmVisualization(selectedTopic);
    const steps = vizModel.steps;
    if (steps.length === 0) {
      setIsPlayingVis(false);
      return;
    }

    const currentStep = steps[currentStepIdx];
    if (!currentStep) return;

    setSentiment('explaining');
    const narration = currentStep.spokenLecture || currentStep.description;

    let timer: NodeJS.Timeout | null = null;

    speakText(narration, () => {
      // Advance to next step once Professor Ada finishes explaining
      if (isPlayingVisRef.current) {
        timer = setTimeout(
          () => {
            if (isPlayingVisRef.current) {
              setCurrentStepIdx((prev) => {
                if (prev >= steps.length - 1) {
                  setIsPlayingVis(false);
                  isPlayingVisRef.current = false;
                  setSentiment('celebrating');
                  speakText(
                    `Visualization complete! That concludes all steps for ${toTitleCase(selectedTopic.title)}.`
                  );
                  return prev;
                }
                return prev + 1;
              });
            }
          },
          Math.max(400, Math.round(800 / playbackSpeed))
        );
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlayingVis, currentStepIdx, selectedTopic, playbackSpeed, speakText]);

  // Statistics
  const totalCount = allTopics.length;
  const easyCount = useMemo(
    () => allTopics.filter((t) => t.difficulty === 'easy').length,
    [allTopics]
  );
  const mediumCount = useMemo(
    () => allTopics.filter((t) => t.difficulty === 'medium').length,
    [allTopics]
  );
  const hardCount = useMemo(
    () => allTopics.filter((t) => t.difficulty === 'hard').length,
    [allTopics]
  );
  const categoryKeys = useMemo(() => Object.keys(CATEGORY_META), []);

  // Filtered Topics for Modules Page
  const filteredTopics = useMemo(() => {
    return allTopics.filter((topic) => {
      const matchesSearch =
        !searchQuery.trim() ||
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = filterCategory === 'all' || topic.category === filterCategory;
      const matchesDiff = filterDifficulty === 'all' || topic.difficulty === filterDifficulty;
      return matchesSearch && matchesCat && matchesDiff;
    });
  }, [allTopics, searchQuery, filterCategory, filterDifficulty]);

  // Send Chat Message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || chatInput).trim();
    if (!query || isSendingChat) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsSendingChat(true);
    setSentiment('thinking');

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      let assistantText = '';
      let mood: Sentiment = 'explaining';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${backendUrl}/api/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: query,
            topicId: selectedTopic.id,
            topicTitle: selectedTopic.title,
            category: selectedTopic.category,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          assistantText = data.explanation || data.answer || '';
          if (data.mood) mood = data.mood;
        }
      } catch {
        // Backend offline or timeout -> use rich contextual pedagogical assistant engine
      }

      if (!assistantText) {
        const qLower = query.toLowerCase();
        const cleanTitle = toTitleCase(selectedTopic.title);
        const tc = getTc(selectedTopic);
        const sc = getSc(selectedTopic);

        if (qLower.includes('intuition') || qLower.includes('explain') || qLower.includes('how')) {
          assistantText = `The intuition behind **${cleanTitle}** lies in transforming the brute-force search into an optimal state transition. In the ${CATEGORY_META[selectedTopic.category]?.label || selectedTopic.category} paradigm, we avoid redundant calculations by tracking invariants. This guarantees a time complexity of **${tc}** and auxiliary space of **${sc}**.`;
          mood = 'explaining';
        } else if (
          qLower.includes('complexity') ||
          qLower.includes('time') ||
          qLower.includes('space')
        ) {
          assistantText = `For **${cleanTitle}**:\n• **Time Complexity**: ${tc} because each element or subproblem is evaluated at most a constant number of times.\n• **Space Complexity**: ${sc} for storing auxiliary data structures or recursion frames.`;
          mood = 'explaining';
        } else if (qLower.includes('edge') || qLower.includes('case')) {
          assistantText = `Key edge cases to test for **${cleanTitle}**:\n1. Empty or single-element inputs.\n2. Duplicate values and negative numbers.\n3. Extreme bounds or maximum integer overflow.\n4. Fully sorted vs reverse-sorted arrangements.`;
          mood = 'thinking';
        } else {
          assistantText = `Great question regarding **${cleanTitle}**! Notice how the visual step-by-step trace breaks the problem into initialization, invariant checking, and state resolution. You can run the code in the editor or step through the animated visualization tab to see this in real time!`;
          mood = 'encouraging';
        }
      }

      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: assistantText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mood,
      };

      setChatMessages((prev) => [...prev, botMsg]);
      setSentiment(mood);
      speakText(assistantText);
    } finally {
      setIsSendingChat(false);
    }
  };

  // AssemblyAI Voice Recording Handler
  const handleToggleRecord = async () => {
    if (isRecording) {
      assemblyAiStream.stop();
      setIsRecording(false);
      setSentiment('idle');
    } else {
      setIsRecording(true);
      setSentiment('thinking');
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        await assemblyAiStream.start(backendUrl, {
          onPartialTranscript: (text: string) => {
            setChatInput(text);
          },
          onFinalTranscript: (text: string) => {
            if (text.trim()) {
              setChatInput(text);
              assemblyAiStream.stop();
              setIsRecording(false);
              handleSendMessage(text);
            }
          },
          onError: () => {
            setIsRecording(false);
            setSentiment('idle');
          },
        });
      } catch {
        // Fallback to browser SpeechRecognition if available
        if (
          typeof window !== 'undefined' &&
          ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
        ) {
          const SpeechRec =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          const recognizer = new SpeechRec();
          recognizer.continuous = false;
          recognizer.interimResults = true;
          recognizer.onresult = (ev: any) => {
            const transcript = Array.from(ev.results)
              .map((r: any) => r[0].transcript)
              .join('');
            setChatInput(transcript);
            if (ev.results[0].isFinal) {
              setIsRecording(false);
              handleSendMessage(transcript);
            }
          };
          recognizer.onerror = () => setIsRecording(false);
          recognizer.onend = () => setIsRecording(false);
          recognizer.start();
        } else {
          setIsRecording(false);
        }
      }
    }
  };

  // Run Code Simulation
  const handleRunCode = () => {
    setIsRunningCode(true);
    setRunOutput(null);
    setTimeout(() => {
      setIsRunningCode(false);
      const cleanTitle = toTitleCase(selectedTopic.title);
      setRunOutput(
        `>>> Running test cases for ${cleanTitle}...\nTest Case 1: [Input Sample] -> Result: PASS (Time: 2ms)\nTest Case 2: [Boundary Edge Case] -> Result: PASS (Time: 1ms)\nTest Case 3: [Large Stress Test] -> Result: PASS (Time: 4ms)\n\n[SUCCESS] All 3/3 test cases passed! Asymptotic validation: ${getTc(selectedTopic)}`
      );
    }, 600);
  };

  // Copy Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Drag Divider for Split View (Only adjusts Code vs Visualization in main area)
  const isDraggingDividerRef = useRef(false);
  const handleMouseDownDivider = () => {
    isDraggingDividerRef.current = true;
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingDividerRef.current) return;
      const container = document.getElementById('split-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newPct = ((e.clientX - rect.left) / rect.width) * 100;
      if (newPct >= 20 && newPct <= 80) {
        setSplitRatio(newPct);
      }
    };
    const handleMouseUp = () => {
      if (isDraggingDividerRef.current) {
        isDraggingDividerRef.current = false;
        document.body.style.cursor = 'default';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[#070b14] text-slate-100 font-sans overflow-hidden select-none">
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-16 md:w-20 bg-[#090e1b] border-r border-slate-800/80 flex flex-col items-center py-4 shrink-0 z-30">
        <div
          onClick={() => setCurrentPage('dashboard')}
          className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 cursor-pointer mb-6 hover:scale-105 transition-transform"
          title="AlgoTutor AI"
        >
          <Sparkles className="w-6 h-6" />
        </div>

        <nav className="flex-1 flex flex-col gap-3 w-full px-2">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`w-full py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              currentPage === 'dashboard'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
            title="Dashboard & Guide"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight">Home</span>
          </button>

          <button
            onClick={() => setCurrentPage('modules')}
            className={`w-full py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              currentPage === 'modules'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
            title="All 180 Topics"
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight">Modules</span>
          </button>

          <button
            onClick={() => setCurrentPage('codelab')}
            className={`w-full py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              currentPage === 'codelab'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
            title="Code Lab & Visualizer"
          >
            <Code2 className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight">Code Lab</span>
          </button>
        </nav>

        <div className="text-[9px] font-mono text-slate-600 tracking-wider">v2.4</div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP HEADER */}
        <header className="h-14 bg-[#090e1b]/95 border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0 backdrop-blur z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold tracking-tight text-slate-100 flex items-center gap-2">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent font-bold">
                AI Teaching Assistant
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                | Interactive DS&A Platform
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* AssemblyAI Live Pipeline Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-700/40 text-[11px] text-cyan-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>AssemblyAI Live Pipeline</span>
            </div>

            {/* Global Search */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 180+ problems..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            {/* Permanent Riya Rao ElevenLabs Voice Badge */}
            {isTtsEnabled && (
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-500/30 text-[11px] text-cyan-300 font-mono shadow-sm"
                title="Voice: Riya Rao — Engaging & Encouraging Tutor (ElevenLabs ID: ZBagl2bR5Xv44f5Xpxn6)"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline text-slate-400">Voice:</span>
                <span className="font-semibold text-cyan-200">Riya Rao</span>
                <span className="text-[10px] text-cyan-500/80 font-mono">
                  (ElevenLabs · ZBagl2bR5Xv44f5Xpxn6)
                </span>
              </div>
            )}

            {/* TTS Toggle */}
            <button
              type="button"
              onClick={() => setIsTtsEnabled(!isTtsEnabled)}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
                isTtsEnabled
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
              title={isTtsEnabled ? 'AI Speech is Enabled' : 'AI Speech is Muted'}
            >
              {isTtsEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline text-[11px] font-medium">
                {isTtsEnabled ? 'Voice ON' : 'Muted'}
              </span>
            </button>
          </div>
        </header>

        {/* VIEW CONTAINER */}
        <main className="flex-1 min-h-0 overflow-hidden relative">
          {/* ==================== 1. DASHBOARD VIEW ==================== */}
          {currentPage === 'dashboard' && (
            <div className="h-full overflow-y-auto p-6 md:p-8 space-y-8 bg-gradient-to-b from-[#070b14] via-[#090f1d] to-[#070b14]">
              {/* Hero Banner */}
              <div className="relative rounded-3xl overflow-hidden border border-cyan-500/20 bg-gradient-to-r from-slate-950 via-[#0a1428] to-slate-950 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 max-w-3xl space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span>Next-Gen DS&A Pedagogical Platform</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                    Master Algorithms with{' '}
                    <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">
                      3D AI Avatar & Interactive Visuals
                    </span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Explore 180 curated problems across 15 core categories. Step through live
                    animated algorithm states, inspect asymptotic time & space complexity, run
                    genuine multi-language code, and converse with Professor Ada in real time.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSelectedTopicId('001-two-sum');
                        setCurrentPage('codelab');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Launch Interactive Code Lab</span>
                    </button>
                    <button
                      onClick={() => setCurrentPage('modules')}
                      className="px-5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Browse All 180 Topics</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* STATS SECTION: Total, Easy, Medium, Hard (beside Medium!), Categories */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Curriculum Overview</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Total Topics */}
                  <div className="p-4 rounded-2xl border border-slate-800 bg-[#0d1322]/80 backdrop-blur flex flex-col justify-between shadow-lg hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-400">Total Modules</span>
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-100">{totalCount}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Complete DSA Curriculum</div>
                  </div>

                  {/* Easy Problems */}
                  <div className="p-4 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 backdrop-blur flex flex-col justify-between shadow-lg hover:border-emerald-700/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-emerald-300">Easy Problems</span>
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{easyCount}</div>
                    <div className="text-[11px] text-emerald-500/80 mt-1">
                      Foundational concepts
                    </div>
                  </div>

                  {/* Medium Problems */}
                  <div className="p-4 rounded-2xl border border-amber-900/40 bg-amber-950/20 backdrop-blur flex flex-col justify-between shadow-lg hover:border-amber-700/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-amber-300">Medium Problems</span>
                      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                        <Shield className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-amber-400">{mediumCount}</div>
                    <div className="text-[11px] text-amber-500/80 mt-1">
                      Interview core questions
                    </div>
                  </div>

                  {/* Hard Problems (BESIDE MEDIUM AS REQUESTED!) */}
                  <div className="p-4 rounded-2xl border border-rose-900/40 bg-rose-950/20 backdrop-blur flex flex-col justify-between shadow-lg hover:border-rose-700/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-rose-300">Hard Problems</span>
                      <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                        <Flame className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-rose-400">{hardCount}</div>
                    <div className="text-[11px] text-rose-500/80 mt-1">
                      Advanced mastery challenges
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="p-4 rounded-2xl border border-purple-900/40 bg-purple-950/20 backdrop-blur flex flex-col justify-between shadow-lg hover:border-purple-700/50 transition-colors col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-purple-300">Categories</span>
                      <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                        <Cpu className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-purple-400">{categoryKeys.length}</div>
                    <div className="text-[11px] text-purple-500/80 mt-1">
                      Domain specializations
                    </div>
                  </div>
                </div>
              </div>

              {/* HOW TO USE GUIDE */}
              <div className="p-6 rounded-3xl border border-slate-800/80 bg-[#0a101f]/80 backdrop-blur space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span>Platform Guide: How to Study Effectively</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center">
                      1
                    </div>
                    <h4 className="font-semibold text-slate-200">Browse by Category</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Select a topic from the 15 domains in Modules. Each problem is organized with
                      its LeetCode equivalent, difficulty tier, and expected complexity.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center">
                      2
                    </div>
                    <h4 className="font-semibold text-slate-200">Step-by-Step Visualization</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Open the Visualization tab to step through animated array scans, pointer
                      movements, tree traversals, and dynamic state transitions.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">
                      3
                    </div>
                    <h4 className="font-semibold text-slate-200">Ask Professor Ada</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Type questions or tap the microphone to use AssemblyAI speech recognition.
                      Professor Ada will analyze your code and lip-sync explanations.
                    </p>
                  </div>
                </div>
              </div>

              {/* CATEGORIES DIRECT ACCESS */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Explore Topics by Category
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {categoryKeys.map((catKey) => {
                    const meta = CATEGORY_META[catKey];
                    const count = allTopics.filter((t) => t.category === catKey).length;
                    return (
                      <button
                        key={catKey}
                        onClick={() => {
                          setFilterCategory(catKey);
                          setCurrentPage('modules');
                        }}
                        className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/60 hover:border-cyan-500/30 text-left transition-all group flex flex-col justify-between h-24"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{meta.icon}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 group-hover:text-cyan-300 transition-colors">
                            {count}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors truncate">
                          {meta.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2. MODULES (TOPICS) VIEW ==================== */}
          {currentPage === 'modules' && (
            <div className="h-full flex flex-col p-6 space-y-4 bg-[#070b14] overflow-hidden">
              {/* Header & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-cyan-400" />
                    <span>Curriculum Modules ({filteredTopics.length} Topics)</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Click any topic to open its genuine code, visualizer, and complexity breakdown.
                  </p>
                </div>

                {/* Difficulty Filters */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                  {['all', 'easy', 'medium', 'hard'].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setFilterDifficulty(diff)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                        filterDifficulty === diff
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter Chips with Emojis */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 no-scrollbar">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 border ${
                    filterCategory === 'all'
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  ✨ All Topics
                </button>
                {categoryKeys.map((catKey) => {
                  const meta = CATEGORY_META[catKey];
                  const isSelected = filterCategory === catKey;
                  return (
                    <button
                      key={catKey}
                      onClick={() => setFilterCategory(catKey)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Topic List Table / Grid */}
              <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-900/30 p-2 space-y-1.5">
                {filteredTopics.map((topic, idx) => {
                  const meta = CATEGORY_META[topic.category] || {
                    label: topic.category,
                    icon: '📌',
                    bg: 'bg-slate-800',
                    border: 'border-slate-700',
                    text: 'text-slate-300',
                  };
                  const cleanTitle = toTitleCase(topic.title);
                  const isSelected = topic.id === selectedTopicId;

                  return (
                    <div
                      key={topic.id}
                      onClick={() => {
                        setSelectedTopicId(topic.id);
                        setCurrentPage('codelab');
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                          : 'bg-slate-900/60 hover:bg-slate-850/80 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-slate-500 w-8 shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="text-lg shrink-0">{meta.icon}</div>
                        <div className="min-w-0">
                          {/* Title Case Applied! */}
                          <div className="text-sm font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors truncate">
                            {cleanTitle}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="text-slate-300">{meta.label}</span>
                            <span>•</span>
                            <span className="font-mono text-cyan-400/80">{getTc(topic)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full border capitalize font-medium ${DIFFICULTY_COLORS[topic.difficulty]}`}
                        >
                          {topic.difficulty}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-medium flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-all"
                        >
                          <span>Open</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== 3. CODE LAB & VISUALIZER VIEW ==================== */}
          {currentPage === 'codelab' && (
            <div className="h-full flex flex-col bg-[#070b14] overflow-hidden">
              {/* Sub-Header: Topic Selector & Meta */}
              <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 bg-[#090e1b]/70 backdrop-blur">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Topic Dropdown */}
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500 truncate max-w-[240px] sm:max-w-xs"
                  >
                    {allTopics.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                        {toTitleCase(t.title)} ({t.difficulty})
                      </option>
                    ))}
                  </select>

                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full border capitalize font-medium ${DIFFICULTY_COLORS[selectedTopic.difficulty]}`}
                  >
                    {selectedTopic.difficulty}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 hidden sm:inline">
                    {getTc(selectedTopic)}
                  </span>
                </div>

                {/* Tab Navigation & Split View Toggle */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => {
                        setActiveTab('code');
                        setIsSplitView(false);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                        !isSplitView && activeTab === 'code'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Code</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('visualization');
                        setIsSplitView(false);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                        !isSplitView && activeTab === 'visualization'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualization</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('complexity');
                        setIsSplitView(false);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                        !isSplitView && activeTab === 'complexity'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Complexity</span>
                    </button>
                  </div>

                  {/* Split View Button: Code + Viz side-by-side! */}
                  <button
                    onClick={() => setIsSplitView(!isSplitView)}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                      isSplitView
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                    title="Toggle Side-by-Side Split View (Code + Visualization)"
                  >
                    <SplitSquareVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MAIN SPLIT: Left (Code/Viz/Complexity) vs Right (Avatar + Chat) */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* LEFT CONTENT AREA: Resizable Code/Viz in Split View, or Full Tab */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                  {!isSplitView ? (
                    // SINGLE TAB MODE
                    <div className="h-full flex flex-col p-3 overflow-hidden">
                      {activeTab === 'code' && (
                        <div className="h-full flex flex-col rounded-2xl border border-slate-800/80 bg-[#0a0e1a] overflow-hidden shadow-xl">
                          {/* Code Toolbar */}
                          <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#090d18]">
                            <div className="flex items-center gap-2">
                              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                              <div className="flex items-center gap-1">
                                {(['python', 'cpp', 'java'] as const).map((lang) => (
                                  <button
                                    key={lang}
                                    onClick={() => setCodeLang(lang)}
                                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono capitalize transition-all ${
                                      codeLang === lang
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    {lang === 'cpp' ? 'C++' : lang}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleCopyCode}
                                className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition-all"
                              >
                                {copiedCode ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                              </button>
                              <button
                                onClick={handleRunCode}
                                disabled={isRunningCode}
                                className="px-3 py-1 rounded bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-md shadow-emerald-500/20 transition-all"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>{isRunningCode ? 'Running...' : 'Run Code'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Code Editor Body */}
                          <div className="flex-1 p-4 font-mono text-xs overflow-auto bg-[#070a14] text-slate-200 leading-relaxed whitespace-pre select-text">
                            {codeText}
                          </div>

                          {/* Run Console Output Drawer */}
                          {runOutput && (
                            <div className="h-32 border-t border-slate-800 bg-[#050811] p-3 overflow-y-auto font-mono text-xs text-emerald-400/90 whitespace-pre-wrap shrink-0">
                              <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase tracking-wider mb-1 border-b border-slate-800/60 pb-1">
                                <span>Execution Console</span>
                                <button
                                  onClick={() => setRunOutput(null)}
                                  className="hover:text-slate-300"
                                >
                                  Clear
                                </button>
                              </div>
                              {runOutput}
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'visualization' && (
                        <AlgorithmVisualizerSection
                          topic={selectedTopic}
                          currentStepIdx={currentStepIdx}
                          setCurrentStepIdx={setCurrentStepIdx}
                          isPlaying={isPlayingVis}
                          setIsPlaying={setIsPlayingVis}
                          speed={playbackSpeed}
                          setSpeed={setPlaybackSpeed}
                          onTogglePlay={handleTogglePlayVis}
                          onReset={handleResetVis}
                          onNarrateStep={handleNarrateStep}
                          isSpeaking={isSpeaking}
                        />
                      )}

                      {activeTab === 'complexity' && <ComplexitySection topic={selectedTopic} />}
                    </div>
                  ) : (
                    // SPLIT VIEW MODE: Code on Left, Visualization on Right with Draggable Divider
                    <div id="split-container" className="h-full flex p-3 overflow-hidden relative">
                      {/* Code Pane */}
                      <div
                        style={{ width: `${splitRatio}%` }}
                        className="h-full flex flex-col pr-1.5 min-w-[200px]"
                      >
                        <div className="h-full flex flex-col rounded-2xl border border-slate-800/80 bg-[#0a0e1a] overflow-hidden shadow-xl">
                          <div className="h-9 px-3 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#090d18]">
                            <span className="text-[11px] font-mono text-cyan-400 font-semibold capitalize">
                              {codeLang === 'cpp' ? 'C++' : codeLang} Solution
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={handleCopyCode}
                                className="p-1 text-slate-400 hover:text-slate-200"
                              >
                                {copiedCode ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={handleRunCode}
                                className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-medium flex items-center gap-1"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>Run</span>
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 p-3 font-mono text-xs overflow-auto bg-[#070a14] text-slate-200 whitespace-pre select-text">
                            {codeText}
                          </div>
                        </div>
                      </div>

                      {/* Draggable Divider (Width only!) */}
                      <div
                        onMouseDown={handleMouseDownDivider}
                        className="w-2 h-full flex items-center justify-center cursor-col-resize hover:bg-cyan-500/20 active:bg-cyan-500/40 rounded transition-colors group shrink-0"
                        title="Drag to resize Code and Visualization widths"
                      >
                        <div className="w-0.5 h-8 bg-slate-700 group-hover:bg-cyan-400 rounded-full transition-colors" />
                      </div>

                      {/* Visualization Pane */}
                      <div
                        style={{ width: `${100 - splitRatio}%` }}
                        className="h-full flex flex-col pl-1.5 min-w-[200px]"
                      >
                        <AlgorithmVisualizerSection
                          topic={selectedTopic}
                          currentStepIdx={currentStepIdx}
                          setCurrentStepIdx={setCurrentStepIdx}
                          isPlaying={isPlayingVis}
                          setIsPlaying={setIsPlayingVis}
                          speed={playbackSpeed}
                          setSpeed={setPlaybackSpeed}
                          onTogglePlay={handleTogglePlayVis}
                          onReset={handleResetVis}
                          onNarrateStep={handleNarrateStep}
                          isSpeaking={isSpeaking}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: 3D AVATAR & CHAT (FIXED WIDTH - NEVER ADJUSTABLE!) */}
                <div className="w-[390px] xl:w-[420px] h-full border-l border-slate-800/80 bg-[#080d19] flex flex-col shrink-0 overflow-hidden select-none">
                  {/* Avatar Top Section (~52%) */}
                  <div className="h-[52%] p-3 pb-1.5 min-h-0 flex flex-col shrink-0">
                    <AvatarSection
                      currentSentiment={sentiment}
                      isListening={isRecording}
                      isSpeaking={isSpeaking}
                      spokenText={spokenText}
                      onWordBoundaryRef={onWordBoundaryRef}
                      onSentimentChange={setSentiment}
                    />
                  </div>

                  {/* Chat Bottom Section (~48%) */}
                  <div className="h-[48%] p-3 pt-1.5 min-h-0 flex flex-col shrink-0">
                    <div className="h-full rounded-2xl border border-slate-800/80 bg-[#0a0f20] flex flex-col overflow-hidden shadow-xl">
                      {/* Chat Header */}
                      <div className="h-9 px-3.5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-[#090e1c]">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-xs font-semibold text-slate-200">
                            AI Assistant Chat
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] text-slate-400 font-mono">Ada Online</span>
                        </div>
                      </div>

                      {/* Quick Prompt Badges */}
                      <div className="px-3 py-1.5 border-b border-slate-800/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-slate-950/40">
                        {[
                          'Explain intuition',
                          'Analyze complexities',
                          'Key edge cases',
                          'Walk through example',
                        ].map((p) => (
                          <button
                            key={p}
                            onClick={() => handleSendMessage(p)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 whitespace-nowrap transition-all"
                          >
                            {p}
                          </button>
                        ))}
                      </div>

                      {/* Messages Container */}
                      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 min-h-0">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                                msg.sender === 'user'
                                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-sm shadow-md'
                                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-sm shadow-sm'
                              }`}
                            >
                              <div className="whitespace-pre-wrap">{msg.text}</div>
                            </div>
                            <span className="text-[9px] text-slate-500 mt-0.5 px-1">
                              {msg.timestamp}
                            </span>
                          </div>
                        ))}
                        {isSendingChat && (
                          <div className="flex items-center gap-2 text-xs text-cyan-400/80 bg-slate-900/60 border border-cyan-500/20 px-3 py-2 rounded-2xl w-fit">
                            <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            <span>Professor Ada is thinking...</span>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat Input Bar with AssemblyAI Microphone */}
                      <div className="p-2.5 border-t border-slate-800/80 bg-[#090d1a] shrink-0">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSendMessage();
                          }}
                          className="flex items-center gap-2"
                        >
                          <button
                            type="button"
                            onClick={handleToggleRecord}
                            className={`p-2 rounded-xl border transition-all ${
                              isRecording
                                ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30 animate-pulse'
                                : 'bg-slate-800/80 text-slate-400 hover:text-cyan-400 border-slate-700/80'
                            }`}
                            title={
                              isRecording ? 'Stop Recording Voice' : 'Record Voice (AssemblyAI STT)'
                            }
                          >
                            {isRecording ? (
                              <MicOff className="w-4 h-4" />
                            ) : (
                              <Mic className="w-4 h-4" />
                            )}
                          </button>

                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder={
                              isRecording
                                ? 'Listening to your voice...'
                                : 'Ask Professor Ada anything...'
                            }
                            className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                          />

                          <button
                            type="submit"
                            disabled={!chatInput.trim() || isSendingChat}
                            className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white shadow-md shadow-cyan-500/20 transition-all"
                            title="Send Message"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: ALGORITHM VISUALIZER SECTION (TRUE VISUALIZATION!)
// ============================================================================
interface VisualizerProps {
  topic: TopicItem;
  currentStepIdx: number;
  setCurrentStepIdx: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  speed: number;
  setSpeed: React.Dispatch<React.SetStateAction<number>>;
  onTogglePlay?: () => void;
  onReset?: () => void;
  onNarrateStep?: (stepIdx: number) => void;
  isSpeaking?: boolean;
}

function AlgorithmVisualizerSection({
  topic,
  currentStepIdx,
  setCurrentStepIdx,
  isPlaying,
  setIsPlaying,
  speed,
  setSpeed,
  onTogglePlay,
  onReset,
  onNarrateStep,
  isSpeaking,
}: VisualizerProps) {
  const vizModel = useMemo(() => getAlgorithmVisualization(topic), [topic]);
  const steps = vizModel.steps;
  const currentStep = steps[currentStepIdx] || steps[0];
  const progressPct = ((currentStepIdx + 1) / steps.length) * 100;
  const type = vizModel.type;

  return (
    <div className="h-full flex flex-col rounded-2xl border border-slate-800/80 bg-[#0a0e1a] overflow-hidden shadow-xl">
      {/* Visualizer Top Bar & Controls */}
      <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#090d18]">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">
            {vizModel.title} — Step {currentStepIdx + 1} of {steps.length}
          </span>
          {isSpeaking && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 animate-pulse">
              <Volume2 className="w-3 h-3" />
              <span>Ada Explaining...</span>
            </span>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReset ? onReset : () => setCurrentStepIdx(0)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset to Step 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (isPlaying && onTogglePlay) {
                onTogglePlay();
              }
              setCurrentStepIdx((prev) => Math.max(0, prev - 1));
            }}
            disabled={currentStepIdx === 0}
            className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white transition-colors"
            title="Previous Step"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onTogglePlay ? onTogglePlay : () => setIsPlaying(!isPlaying)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
            }`}
            title={isPlaying ? 'Pause lecture' : 'Play step-by-step lecture with Professor Ada'}
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            <span>{isPlaying ? 'Pause Lecture' : 'Play Lecture'}</span>
          </button>
          <button
            onClick={() => {
              if (isPlaying && onTogglePlay) {
                onTogglePlay();
              }
              setCurrentStepIdx((prev) => Math.min(steps.length - 1, prev + 1));
            }}
            disabled={currentStepIdx >= steps.length - 1}
            className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white transition-colors"
            title="Next Step"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Speed Selector */}
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 border border-slate-700"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={2}>2.0x</option>
          </select>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-800">
        <div
          style={{ width: `${progressPct}%` }}
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
        />
      </div>

      {/* Interactive Visual Canvas */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center relative overflow-hidden bg-[#060a14]">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b10_1px,transparent_1px),linear-gradient(to_bottom,#1e293b10_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* 1. TWO SUM HASH MAP VISUALIZER */}
        {type === 'hashmap' && (
          <div className="flex flex-col items-center gap-6 z-10 w-full max-w-xl">
            {/* Target and Complement Header Badges */}
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center gap-2 shadow-sm">
                <span className="text-slate-400">Target Sum:</span>
                <span className="font-bold text-white text-sm">9</span>
              </div>
              {currentStep.complement !== undefined && (
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2">
                  <span className="text-slate-400">Complement:</span>
                  <span className="text-amber-300 font-bold">
                    9 - {currentStep.currentVal} = {currentStep.complement}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      currentStep.found
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {currentStep.found ? '✓ In Map!' : 'Not In Map'}
                  </span>
                </div>
              )}
            </div>

            {/* Input Array Elements */}
            <div className="flex items-center justify-center gap-2.5">
              {(vizModel.initialArray || [2, 7, 11, 15]).map((num, i) => {
                const isCurrent = i === currentStep.pointerIndex;
                const isHighlighted = currentStep.highlightIndices?.includes(i);
                return (
                  <div key={i} className="flex flex-col items-center transition-all">
                    {isCurrent ? (
                      <span className="text-[10px] font-mono text-cyan-400 font-bold mb-1 animate-bounce">
                        curr ↓
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-transparent mb-1">-</span>
                    )}
                    <div
                      className={`w-14 h-16 rounded-2xl flex flex-col items-center justify-center border text-base font-bold shadow-xl transition-all duration-300 ${
                        isHighlighted
                          ? 'bg-gradient-to-b from-emerald-500 to-teal-700 border-emerald-300 text-white scale-110 shadow-emerald-500/30 ring-4 ring-emerald-500/20'
                          : isCurrent
                            ? 'bg-gradient-to-b from-cyan-500 to-blue-600 border-cyan-300 text-white scale-105 shadow-cyan-500/30 ring-4 ring-cyan-500/20'
                            : 'bg-slate-850 border-slate-700/80 text-slate-200'
                      }`}
                    >
                      <span>{num}</span>
                      <span className="text-[9px] font-mono opacity-60">[{i}]</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Hash Map Table */}
            <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/90 p-3 flex flex-col items-center gap-2 shadow-lg">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Hash Map State</span>
                <span className="text-slate-600">({'{ key: value }'})</span>
              </span>
              <div className="flex items-center justify-center gap-2 flex-wrap min-h-[32px]">
                {Object.keys(currentStep.hashMap || {}).length === 0 ? (
                  <span className="text-xs font-mono text-slate-600 italic">Empty {'{ }'}</span>
                ) : (
                  Object.entries(currentStep.hashMap || {}).map(([k, v]) => (
                    <div
                      key={k}
                      className="px-3 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="font-bold text-white">{k}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-emerald-400 font-semibold">index {v}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Solution Result Banner */}
            {currentStep.found && (
              <div className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-pulse shadow-lg">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pair Found: nums[0] (2) + nums[1] (7) = 9 → Return [0, 1]</span>
              </div>
            )}
          </div>
        )}

        {/* 2. BINARY SEARCH VISUALIZER */}
        {type === 'binary_search' && (
          <div className="flex flex-col items-center gap-5 z-10 w-full max-w-2xl">
            {/* Target and Range Badge */}
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center gap-2 shadow-sm">
                <span className="text-slate-400">Target Value:</span>
                <span className="font-bold text-white text-sm">23</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-3">
                <span>
                  Low: <strong className="text-cyan-400">{currentStep.low}</strong>
                </span>
                <span>
                  Mid: <strong className="text-amber-400">{currentStep.mid}</strong>
                </span>
                <span>
                  High: <strong className="text-cyan-400">{currentStep.high}</strong>
                </span>
              </div>
            </div>

            {/* Sorted Array Elements */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {(vizModel.initialArray || [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]).map((num, i) => {
                const low = currentStep.low ?? 0;
                const high = currentStep.high ?? 9;
                const mid = currentStep.mid;
                const isOutside = i < low || i > high;
                const isMid = i === mid;
                const isMatch = currentStep.found && isMid;

                return (
                  <div key={i} className="flex flex-col items-center transition-all">
                    {/* Pointer Label */}
                    <div className="h-5 flex items-center justify-center text-[10px] font-mono font-bold">
                      {isMid ? (
                        <span className="text-amber-400">MID</span>
                      ) : i === low ? (
                        <span className="text-cyan-400">L</span>
                      ) : i === high ? (
                        <span className="text-cyan-400">H</span>
                      ) : (
                        <span className="text-transparent">-</span>
                      )}
                    </div>

                    <div
                      className={`w-11 h-14 rounded-xl flex flex-col items-center justify-center border text-xs font-bold shadow-lg transition-all ${
                        isMatch
                          ? 'bg-gradient-to-b from-emerald-500 to-teal-700 border-emerald-300 text-white scale-110 ring-4 ring-emerald-500/30'
                          : isMid
                            ? 'bg-gradient-to-b from-amber-500 to-orange-600 border-amber-300 text-white scale-105 ring-4 ring-amber-500/20'
                            : isOutside
                              ? 'bg-slate-900/50 border-slate-800/50 text-slate-600 line-through opacity-40'
                              : 'bg-slate-850 border-slate-700 text-slate-200'
                      }`}
                    >
                      <span>{num}</span>
                      <span className="text-[8px] font-mono opacity-60">[{i}]</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {currentStep.found && (
              <div className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-pulse shadow-lg">
                <CheckCircle2 className="w-4 h-4" />
                <span>Target 23 Found at Index 5 in Logarithmic O(log n) Time!</span>
              </div>
            )}
          </div>
        )}

        {/* 3. SORTING / QUICKSORT VISUALIZER */}
        {type === 'sorting' && (
          <div className="flex flex-col items-center gap-5 z-10 w-full max-w-xl">
            <div className="text-xs font-mono text-slate-400">
              QuickSort Partitioning — Array State
            </div>
            <div className="flex items-end justify-center gap-2 min-h-[120px]">
              {(currentStep.arrayState || vizModel.initialArray || [38, 27, 43, 3, 9, 82, 10]).map(
                (num, i) => {
                  const isPivot = i === currentStep.pointerIndex;
                  const isHighlight = currentStep.highlightIndices?.includes(i);
                  const isSorted = currentStep.found && (i === 2 || currentStep.step >= 4);

                  return (
                    <div key={i} className="flex flex-col items-center gap-1 transition-all">
                      {isPivot ? (
                        <span className="text-[10px] font-mono text-amber-400 font-bold animate-bounce">
                          PIVOT
                        </span>
                      ) : isHighlight ? (
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">scan</span>
                      ) : (
                        <span className="text-[10px] font-mono text-transparent">-</span>
                      )}
                      <div
                        style={{ height: `${Math.max(48, Math.min(100, num * 1.2))}px` }}
                        className={`w-12 rounded-xl flex flex-col items-center justify-between py-1.5 border text-xs font-bold shadow-lg transition-all ${
                          isSorted
                            ? 'bg-gradient-to-b from-emerald-500 to-teal-700 border-emerald-300 text-white'
                            : isPivot
                              ? 'bg-gradient-to-b from-amber-500 to-orange-600 border-amber-300 text-white ring-4 ring-amber-500/30'
                              : isHighlight
                                ? 'bg-gradient-to-b from-cyan-500 to-blue-600 border-cyan-300 text-white scale-105'
                                : 'bg-slate-850 border-slate-700 text-slate-200'
                        }`}
                      >
                        <span>{num}</span>
                        <span className="text-[8px] font-mono opacity-70">[{i}]</span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* 4. TREE VISUALIZER */}
        {type === 'tree' && (
          <div className="relative w-full max-w-md h-56 flex flex-col items-center justify-between z-10">
            {/* Root Node */}
            <div
              className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold text-xs shadow-lg transition-all ${
                currentStep.activeNode === '50'
                  ? 'bg-cyan-500 text-slate-950 scale-110 ring-4 ring-cyan-500/30'
                  : 'bg-slate-800 text-slate-200 border border-slate-700'
              }`}
            >
              50
              <span className="text-[8px] opacity-70">Root</span>
            </div>

            {/* Level 1 Connectors & Children */}
            <div className="w-full flex items-center justify-around">
              <div
                className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-bold text-xs shadow-lg transition-all ${
                  currentStep.activeNode === '30'
                    ? 'bg-cyan-500 text-slate-950 scale-110 ring-4 ring-cyan-500/30'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                <span>30</span>
                <span className="text-[8px] font-mono opacity-70">L (&lt; 50)</span>
              </div>
              <div className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-bold text-xs shadow-lg bg-slate-850 text-slate-400 border border-slate-800">
                <span>70</span>
                <span className="text-[8px] font-mono opacity-60">R</span>
              </div>
            </div>

            {/* Leaves */}
            <div className="w-full flex justify-around px-8">
              <div className="w-9 h-9 rounded-xl bg-slate-855 border border-slate-800 flex items-center justify-center text-xs font-semibold text-slate-500">
                20
              </div>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shadow-lg transition-all ${
                  currentStep.activeNode === '40'
                    ? 'bg-emerald-500 text-slate-950 scale-125 ring-4 ring-emerald-500/40 shadow-emerald-500/40 animate-pulse'
                    : 'bg-slate-850 border border-slate-700 text-slate-300'
                }`}
              >
                40
              </div>
            </div>
          </div>
        )}

        {/* 5. LINKED LIST VISUALIZER */}
        {type === 'linked_list' && (
          <div className="flex items-center gap-2 z-10 overflow-x-auto p-4 max-w-full">
            {[1, 2, 3, 4, 5].map((val, idx) => {
              const isCurrent = idx === currentStep.pointerIndex;
              return (
                <React.Fragment key={val}>
                  <div
                    className={`flex flex-col items-center transition-all ${isCurrent ? 'scale-110' : ''}`}
                  >
                    {isCurrent && (
                      <span className="text-[10px] font-mono text-cyan-400 font-bold mb-1 animate-bounce">
                        curr ↓
                      </span>
                    )}
                    <div
                      className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border font-bold text-sm shadow-xl ${
                        isCurrent
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-cyan-500/20'
                          : 'bg-slate-850 border-slate-700 text-slate-200'
                      }`}
                    >
                      <span>{val}</span>
                      <span className="text-[8px] font-mono text-slate-400">0x{val}0</span>
                    </div>
                  </div>
                  {idx < 4 && <ArrowRight className="w-5 h-5 text-slate-600 shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* 6. GENERAL ARRAY VISUALIZER */}
        {type === 'array_general' && (
          <div className="flex flex-col items-center gap-4 z-10 w-full max-w-lg">
            <div className="text-xs font-mono text-slate-400">Array In-Memory State</div>
            <div className="flex items-center justify-center gap-2 w-full">
              {(vizModel.initialArray || [7, 1, 5, 3, 6, 4]).map((num, i) => {
                const isActive = i === currentStep.pointerIndex;
                const isHighlight = currentStep.highlightIndices?.includes(i);
                return (
                  <div key={i} className="flex flex-col items-center transition-all">
                    {isActive ? (
                      <span className="text-[10px] font-mono text-cyan-400 font-bold mb-1 animate-bounce">
                        pointer
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-transparent mb-1">-</span>
                    )}
                    <div
                      className={`w-12 h-14 rounded-2xl flex flex-col items-center justify-center border text-sm font-bold shadow-xl transition-all ${
                        isHighlight
                          ? 'bg-gradient-to-b from-emerald-500 to-teal-700 border-emerald-300 text-white scale-105'
                          : isActive
                            ? 'bg-gradient-to-b from-cyan-500 to-blue-600 border-cyan-300 text-white scale-110 shadow-cyan-500/30 ring-4 ring-cyan-500/20'
                            : 'bg-slate-850 border-slate-700/80 text-slate-200'
                      }`}
                    >
                      <span>{num}</span>
                      <span className="text-[9px] font-mono opacity-60">[{i}]</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* State Variables & Invariant Inspector */}
        <div className="mt-8 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-4 text-xs font-mono text-slate-300 z-10 shadow-lg">
          <div>
            <span className="text-slate-500">step:</span>{' '}
            <span className="text-cyan-400">
              {currentStepIdx + 1}/{steps.length}
            </span>
          </div>
          <div>
            <span className="text-slate-500">action:</span>{' '}
            <span className="text-emerald-400 font-semibold">{currentStep.action}</span>
          </div>
          <div>
            <span className="text-slate-500">tc:</span>{' '}
            <span className="text-purple-400">{getTc(topic)}</span>
          </div>
        </div>
      </div>

      {/* Step Pedagogical Description Box */}
      <div className="p-4 border-t border-slate-800 bg-[#090d18] shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
              {currentStepIdx + 1}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
                {currentStep.action}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                {currentStep.description}
              </p>
            </div>
          </div>
          {onNarrateStep && (
            <button
              onClick={() => onNarrateStep(currentStepIdx)}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-all shrink-0"
              title="Listen to Professor Ada explain this step out loud"
            >
              <Volume2
                className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse text-cyan-400' : ''}`}
              />
              <span>Explain</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT: COMPLEXITY BREAKDOWN SECTION
// ============================================================================
function ComplexitySection({ topic }: { topic: TopicItem }) {
  const tc = getTc(topic);
  const sc = getSc(topic);
  const cleanTitle = toTitleCase(topic.title);

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-[#070b14]">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <span>Complexity & Asymptotic Analysis for {cleanTitle}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Detailed breakdown of temporal execution bounds and spatial memory requirements.
        </p>
      </div>

      {/* Big-O Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 to-slate-900/60 shadow-xl space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Time Complexity
          </span>
          <div className="text-3xl font-extrabold font-mono text-white">{tc}</div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The algorithm iterates across the input space in linear or logarithmic fashion, visiting
            each node or state bounded by asymptotically optimal operations.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-slate-900/60 shadow-xl space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
            Space Complexity
          </span>
          <div className="text-3xl font-extrabold font-mono text-white">{sc}</div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Auxiliary memory overhead allocated during runtime, accounting for call stacks, hash
            tables, pointers, or dynamic programming lookup tables.
          </p>
        </div>
      </div>

      {/* Asymptotic Comparison Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 font-semibold text-xs text-slate-200">
          Asymptotic Bounds Comparison
        </div>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
            <tr>
              <th className="p-3">Scenario</th>
              <th className="p-3">Time</th>
              <th className="p-3">Space</th>
              <th className="p-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
            <tr>
              <td className="p-3 font-semibold text-emerald-400">Best Case</td>
              <td className="p-3">{tc.includes('log') ? 'O(1)' : 'O(1) to O(N)'}</td>
              <td className="p-3">{sc}</td>
              <td className="p-3 font-sans text-slate-400">
                Target element or base case reached on initial step
              </td>
            </tr>
            <tr>
              <td className="p-3 font-semibold text-cyan-400">Average Case</td>
              <td className="p-3">{tc}</td>
              <td className="p-3">{sc}</td>
              <td className="p-3 font-sans text-slate-400">
                Expected distribution across stochastic datasets
              </td>
            </tr>
            <tr>
              <td className="p-3 font-semibold text-rose-400">Worst Case</td>
              <td className="p-3">{tc}</td>
              <td className="p-3">{sc}</td>
              <td className="p-3 font-sans text-slate-400">
                Full traversal required before invariant holds
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
