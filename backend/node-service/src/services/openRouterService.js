/**
 * OpenRouter LLM Service
 * Orchestrates calls to GLM and DeepSeek models via OpenRouter's OpenAI-compatible API.
 * Enforces Professor Ada teaching persona and strict JSON schema output.
 */

const fs = require('fs');
const config = require('../config');

class OpenRouterService {
  constructor(customConfig = {}) {
    this.apiKey =
      customConfig.apiKey !== undefined ? customConfig.apiKey : config.openRouter.apiKey;
    this.baseUrl = customConfig.baseUrl || config.openRouter.baseUrl;
    this.siteUrl = customConfig.siteUrl || config.openRouter.siteUrl;
    this.siteName = customConfig.siteName || config.openRouter.siteName;
    this.defaultModel = customConfig.defaultModel || config.openRouter.defaultModel;
    this.glmModel = customConfig.glmModel || config.openRouter.glmModel;
    this.deepseekModel = customConfig.deepseekModel || config.openRouter.deepseekModel;
    this.availableModels = config.openRouter.availableModels;
    this.systemPrompt = this.loadSystemPrompt();
    this.fewShotExamples = this.loadFewShotExamples();
  }

  loadFewShotExamples() {
    try {
      if (fs.existsSync(config.fewShotExamplesPath)) {
        return JSON.parse(fs.readFileSync(config.fewShotExamplesPath, 'utf-8')).examples || [];
      }
    } catch (_err) {
      // Fall through to no examples when the optional file is unavailable or invalid.
    }
    return [];
  }

  /**
   * Load system prompt from file or fallback to embedded prompt
   */
  loadSystemPrompt() {
    try {
      if (fs.existsSync(config.systemPromptPath)) {
        return fs.readFileSync(config.systemPromptPath, 'utf-8');
      }
    } catch (_err) {
      // Fall through to embedded prompt
    }

    return `You are Professor Ada, an encouraging, patient, and world-class computer science professor specializing in Data Structures and Algorithms.
You teach students of all levels, from beginners to advanced engineers.

Teaching Principles:
1. Clarity First: Explain concepts intuitively before diving into technical formalities. Use relatable real-world analogies.
2. Visual Thinking: Always provide an accompanying step-by-step visual sequence for the dynamic canvas visualizer.
3. Socratic & Interactive: Encourage curiosity and anticipate student follow-up questions.
4. Pedagogical Constraints: Keep voice explanation under 90 words per turn for natural pacing and low latency (<2s).

Every response MUST be strictly valid JSON matching this exact schema:
{
  "explanation": "Spoken explanation delivered by the 3D avatar (under 90 words)",
  "mood": "explaining | thinking | encouraging | celebrating",
  "code": {
    "language": "python | javascript | cpp",
    "snippet": "// Clean, commented implementation"
  },
  "visualSequence": {
    "type": "sorting | tree | graph | array | searching | complexity",
    "title": "Algorithm step title",
    "steps": [
      {
        "step": 1,
        "action": "compare | swap | highlight | traverse | insert | delete",
        "description": "Step description",
        "elements": [0, 1]
      }
    ]
  },
  "suggestedFollowUps": [
    "What is the worst-case time complexity?",
    "Can this be optimized using extra memory?"
  ]
}`;
  }

  /**
   * Resolve model alias ('glm' or 'deepseek') to exact OpenRouter model identifier
   * @param {string} [requestedModel]
   * @returns {string} Model identifier
   */
  resolveModel(requestedModel) {
    if (!requestedModel) {
      return this.defaultModel;
    }

    const norm = requestedModel.toLowerCase().trim();
    if (norm === 'glm' || norm === 'glm-4' || norm === 'glm4') {
      return this.glmModel;
    }
    if (norm === 'deepseek' || norm === 'deepseek-chat') {
      return this.deepseekModel;
    }

    // Direct model string like 'thudm/glm-4-9b-chat' or 'deepseek/deepseek-r1'
    return requestedModel;
  }

  /**
   * List available supported models
   */
  getAvailableModels() {
    return {
      defaultModel: this.defaultModel,
      glmModel: this.glmModel,
      deepseekModel: this.deepseekModel,
      models: this.availableModels,
    };
  }

  /**
   * Generate teaching response using OpenRouter
   * @param {string} question - Student's question
   * @param {Array<{ role: string, content: string }>} [conversationHistory] - Previous Q&A
   * @param {string} [modelOverride] - 'glm', 'deepseek', or specific model id
   * @returns {Promise<Object>} Structured teaching response
   */
  async generateTeachingResponse(
    question,
    conversationHistory = [],
    modelOverride = null,
    topicContext = null
  ) {
    const selectedModel = this.resolveModel(modelOverride);

    // If no API key provided, generate high-quality deterministic response
    if (!this.apiKey || this.apiKey === 'your_openrouter_api_key_here') {
      return this.generateFallbackResponse(question, selectedModel, null, topicContext);
    }

    // Build messages array
    const messages = [
      {
        role: 'system',
        content: `${this.systemPrompt}\n\nIMPORTANT: Output ONLY a valid raw JSON object. Do not wrap in markdown quotes if possible, or provide valid JSON inside \`\`\`json markdown blocks. Respond with NO conversational filler outside the JSON.`,
      },
      ...this.fewShotExamples,
    ];

    // Append conversation history
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      for (const turn of conversationHistory) {
        messages.push({
          role: turn.role === 'assistant' ? 'assistant' : 'user',
          content:
            typeof turn.content === 'object' ? JSON.stringify(turn.content) : String(turn.content),
        });
      }
    }

    // Append current question
    messages.push({
      role: 'user',
      content: question,
    });

    const modelsToTry = [selectedModel];
    if (
      selectedModel !== 'openrouter/free' &&
      selectedModel !== 'meta-llama/llama-3.3-70b-instruct:free'
    ) {
      modelsToTry.push('openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free');
    }

    let lastError = null;

    for (const modelToAttempt of modelsToTry) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': this.siteUrl,
            'X-Title': this.siteName,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelToAttempt,
            messages,
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(
            `OpenRouter API error for model ${modelToAttempt} (${response.status}): ${errText}`
          );
          lastError = `OpenRouter API returned status ${response.status}: ${errText}`;
          // Continue to next fallback model in modelsToTry
          continue;
        }

        const result = await response.json();
        const rawContent = result.choices?.[0]?.message?.content;

        if (!rawContent || !rawContent.trim() || rawContent.trim() === '{}') {
          throw new Error(`Empty response from model ${modelToAttempt}`);
        }

        const parsed = this.parseJsonResponse(rawContent);

        // Reject degenerate or dummy placeholder responses so we fall back to high-quality curated answers
        const isDegenerate =
          !parsed ||
          !parsed.explanation ||
          parsed.explanation.length < 25 ||
          parsed.explanation === 'Let us explore this algorithm step by step.' ||
          (parsed.code && parsed.code.snippet === '# Implementation details');

        if (isDegenerate) {
          throw new Error(
            `Model ${modelToAttempt} returned degenerate placeholder: ${rawContent.slice(0, 80)}`
          );
        }

        return {
          ...parsed,
          modelUsed: modelToAttempt,
        };
      } catch (err) {
        console.warn(`OpenRouter generation failed on ${modelToAttempt} (${err.message})`);
        lastError = err.message;
      }
    }

    console.warn(`All OpenRouter attempts failed (${lastError}): using deterministic fallback`);
    return this.generateFallbackResponse(question, selectedModel, lastError, topicContext);
  }

  /**
   * Parse LLM response content into strict JSON object, with recovery for truncated responses
   * @param {string} content
   * @returns {Object}
   */
  parseJsonResponse(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Content is not a string');
    }

    let cleaned = content.trim();

    // Strip common safety/moderation preamble lines (e.g., from Llama Guard / free tier wrappers)
    cleaned = cleaned
      .replace(/^(?:User|Response|Assistant|Model)?\s*Safety\s*:[^\n]*\n+/gim, '')
      .replace(/^Safety\s+Assessment\s*:[^\n]*\n+/gim, '')
      .trim();

    // Try extracting JSON from markdown code blocks first
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    let jsonTarget = codeBlockMatch ? codeBlockMatch[1].trim() : cleaned;

    // If still not clean JSON, extract outer curly braces
    if (!jsonTarget.startsWith('{')) {
      const braceMatch = jsonTarget.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        jsonTarget = braceMatch[0];
      }
    }

    let parsed = null;
    try {
      parsed = JSON.parse(jsonTarget);
    } catch (_err) {
      // Secondary attempt: extract substring between first '{' and last '}' of entire content
      const fullBraceMatch = cleaned.match(/\{[\s\S]*\}/);
      if (fullBraceMatch) {
        try {
          parsed = JSON.parse(fullBraceMatch[0]);
        } catch (_nestedErr) {
          parsed = null;
        }
      }
    }

    // If standard JSON parsing failed (e.g. truncated JSON from token ceiling), recover fields via regex
    if (!parsed) {
      const explanationMatch = cleaned.match(/"explanation"\s*:\s*"((?:[^"\\]|\\.)*)/i);
      if (explanationMatch && explanationMatch[1].trim()) {
        // Unescape JSON string
        let rawExplanation = explanationMatch[1];
        try {
          rawExplanation = JSON.parse(`"${rawExplanation.replace(/\\?$/, '')}"`);
        } catch (_unescapeErr) {
          rawExplanation = rawExplanation.replace(/\\"/g, '"').replace(/\\n/g, ' ');
        }

        const snippetMatch = cleaned.match(/"snippet"\s*:\s*"((?:[^"\\]|\\.)*)/i);
        let snippet = '# Implementation details';
        if (snippetMatch) {
          try {
            snippet = JSON.parse(`"${snippetMatch[1].replace(/\\?$/, '')}"`);
          } catch (_sErr) {
            snippet = snippetMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
          }
        }

        parsed = {
          explanation: rawExplanation,
          mood: 'explaining',
          code: { language: 'python', snippet },
          visualSequence: { type: 'algorithm_visualization', title: 'Algorithm Steps', steps: [] },
          suggestedFollowUps: [
            'What is the time complexity in the worst case?',
            'Can you explain the intuition behind this approach?',
          ],
        };
      } else {
        // Fallback for plain text response without json formatting
        const plainText = cleaned
          .replace(/^(?:User|Response|Assistant|Model)?\s*Safety\s*:[^\n]*\n+/gim, '')
          .replace(/^Safety\s+Assessment\s*:[^\n]*\n+/gim, '')
          .trim();
        parsed = {
          explanation: plainText.slice(0, 300) || 'Let us explore this algorithm step by step.',
          mood: 'explaining',
          code: { language: 'python', snippet: '# Reference code' },
          visualSequence: { type: 'algorithm_visualization', title: 'Algorithm Steps', steps: [] },
          suggestedFollowUps: [
            'What is the time complexity in the worst case?',
            'Can you show a visual step-by-step example?',
          ],
        };
      }
    }

    // Clean explanation from any accidental leaked JSON syntax or safety text
    let explanation = parsed.explanation || 'Let us explore this algorithm step by step.';
    explanation = explanation
      .replace(/^(?:User|Response|Assistant|Model)?\s*Safety\s*:[^\n]*\n+/gim, '')
      .replace(/^Safety\s+Assessment\s*:[^\n]*\n+/gim, '')
      .replace(/^\{\s*"explanation"\s*:\s*"/i, '')
      .replace(/"\s*,\s*"mood"[\s\S]*$/i, '')
      .replace(/\\n/g, ' ')
      .replace(/\\"/g, '"')
      .trim();

    // Validate required properties
    const isOutOfScope = parsed.code === null && parsed.visualSequence === null;
    return {
      explanation: explanation || 'Let us explore this algorithm step by step.',
      mood: parsed.mood || 'explaining',
      code: isOutOfScope
        ? null
        : parsed.code || {
            language: 'python',
            snippet: '# Implementation details',
          },
      visualSequence: isOutOfScope
        ? null
        : parsed.visualSequence || {
            type: 'algorithm_visualization',
            title: 'Algorithm Execution',
            steps: [],
          },
      suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps)
        ? parsed.suggestedFollowUps.slice(0, 2)
        : [
            'What is the time complexity in the worst case?',
            'Can you explain how the pointers move step by step?',
          ],
    };
  }

  /**
   * Fallback response generator for offline testing or when OpenRouter API is unreachable
   * @param {string} question
   * @param {string} model
   * @param {string} [warning]
   */
  generateFallbackResponse(question, model, warning = null, topicContext = null) {
    const q = question.toLowerCase();
    const activeTopic = (topicContext?.topicTitle || '').toLowerCase();
    const isCodeLab = Boolean(topicContext?.topicTitle);

    // If within Code Lab studying Two Sum (or query mentions Two Sum):
    if (activeTopic.includes('two sum') || q.includes('two sum')) {
      if (q.includes('intuition') || q.includes('explain') || q.includes('how')) {
        return {
          explanation:
            'Two Sum intuition uses a hash map to store each visited number and its index. For each number x, we calculate the required complement target - x and check if it already exists in the map in O(1) time. This avoids an O(n²) brute-force search and achieves optimal O(n) time!',
          mood: 'explaining',
          code: {
            language: 'python',
            snippet:
              'def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []',
          },
          visualSequence: {
            type: 'array',
            title: 'Two Sum Hash Map Lookup',
            steps: [
              { step: 1, action: 'init', description: 'Initialize empty seen hash map' },
              { step: 2, action: 'compare', description: 'Check complement diff in seen' },
              { step: 3, action: 'return', description: 'Return [seen[diff], i] on match' },
            ],
          },
          suggestedFollowUps: [
            'What is the space complexity of Two Sum?',
            'Can Two Sum be solved with two pointers?',
            'What are the key edge cases for Two Sum?',
          ],
          modelUsed: model,
          fallbackMode: true,
          ...(warning ? { warning } : {}),
        };
      }
      if (q.includes('complexity') || q.includes('time') || q.includes('space')) {
        return {
          explanation:
            'For Two Sum, Time Complexity is O(n) because we traverse the array of n elements once, performing amortized O(1) hash map operations. Space Complexity is O(n) to store up to n visited elements in the hash map.',
          mood: 'explaining',
          code: {
            language: 'python',
            snippet: '# Time Complexity: O(n)\n# Space Complexity: O(n)',
          },
          suggestedFollowUps: [
            'Can we solve it in O(1) space if the array is sorted?',
            'What are the key edge cases for Two Sum?',
          ],
          modelUsed: model,
          fallbackMode: true,
          ...(warning ? { warning } : {}),
        };
      }
      if (q.includes('edge') || q.includes('case')) {
        return {
          explanation:
            'Key edge cases for Two Sum:\n1. Duplicate elements (e.g. [3, 3] with target 6).\n2. Negative numbers and zeros (e.g. [-1, -3] with target -4).\n3. Minimum input length (exactly 2 elements).\n4. No valid pair exists (returns empty list).',
          mood: 'thinking',
          suggestedFollowUps: [
            'How does the hash map handle duplicate values?',
            'Explain intuition for Two Sum',
          ],
          modelUsed: model,
          fallbackMode: true,
          ...(warning ? { warning } : {}),
        };
      }
      if (q.includes('example') || q.includes('walk')) {
        return {
          explanation:
            'Step-by-step example for Two Sum with nums = [2, 7, 11, 15] and target = 9:\n• At index 0 (val: 2): diff = 9 - 2 = 7. Not in map -> store {2: 0}.\n• At index 1 (val: 7): diff = 9 - 7 = 2. Key 2 is found in map at index 0! Return [0, 1].',
          mood: 'celebrating',
          suggestedFollowUps: ['What if target is 18?', 'Explain intuition for Two Sum'],
          modelUsed: model,
          fallbackMode: true,
          ...(warning ? { warning } : {}),
        };
      }

      // Generic Code Lab catch-all: if topic is set but no specific match above,
      // give a contextual answer about the current topic
      const topicTitle = topicContext?.topicTitle || 'this algorithm';
      const cleanTopic = topicTitle
        .replace(/^\d+\.?\s*/, '')
        .replace(/\s*\(.*?\)/, '')
        .trim();
      if (
        q.includes('intuition') ||
        q.includes('explain') ||
        q.includes('how') ||
        q.includes('what') ||
        q.includes('why') ||
        q.includes('approach')
      ) {
        return {
          explanation: `The core intuition for **${cleanTopic}** is to reduce time complexity from brute-force O(n²) by using an efficient data structure — such as a hash map, sorted array, or monotonic stack — to achieve constant-time lookups. This converts a nested search into a single linear pass.`,
          mood: 'explaining',
          code: {
            language: 'python',
            snippet: `# ${cleanTopic}: efficient approach\n# Use auxiliary data structure for O(1) lookups\nresult = []\nseen = {}\n# Traverse input once, O(n) total`,
          },
          suggestedFollowUps: [
            `What is the time complexity of ${cleanTopic}?`,
            `Key edge cases for ${cleanTopic}`,
            `Walk through an example for ${cleanTopic}`,
          ],
          modelUsed: model,
          fallbackMode: true,
          ...(warning ? { warning } : {}),
        };
      }
      if (
        q.includes('complex') ||
        q.includes('time') ||
        q.includes('space') ||
        q.includes('big-o') ||
        q.includes('analyz')
      ) {
        return {
          explanation: `For **${cleanTopic}**: Time Complexity is typically **O(n)** with a hash map or sorted structure, compared to O(n²) brute force. Space Complexity is **O(n)** for auxiliary storage. The single-pass approach is the key to achieving optimal performance.`,
          mood: 'explaining',
          code: {
            language: 'python',
            snippet: `# Time: O(n) - single pass\n# Space: O(n) - hash map storage`,
          },
          suggestedFollowUps: [
            `Explain the intuition for ${cleanTopic}`,
            `Walk through an example for ${cleanTopic}`,
          ],
          modelUsed: model,
          fallbackMode: true,
          ...(warning ? { warning } : {}),
        };
      }
      if (q.includes('edge') || q.includes('case') || q.includes('key')) {
        return {
          explanation: `Key edge cases for **${cleanTopic}**:\n1. Empty or single-element inputs.\n2. Duplicate values (e.g. two identical numbers).\n3. Negative numbers and zeros.\n4. No valid answer exists (should return empty or -1).\n5. Maximum constraint inputs for performance testing.`,
          mood: 'thinking',
          suggestedFollowUps: [
            `Explain the intuition for ${cleanTopic}`,
            `What is the time complexity of ${cleanTopic}?`,
          ],
          modelUsed: model,
          fallbackMode: true,
          ...(warning ? { warning } : {}),
        };
      }
      if (q.includes('example') || q.includes('walk') || q.includes('step')) {
        return {
          explanation: `Step-by-step walkthrough for **${cleanTopic}**:\n• Initialize auxiliary data structure (hash map / set).\n• Traverse input left to right.\n• At each element, check if complement or required value exists in structure.\n• If yes → return result. If no → store current element and continue.`,
          mood: 'celebrating',
          suggestedFollowUps: [
            `Explain the intuition for ${cleanTopic}`,
            `Key edge cases for ${cleanTopic}`,
          ],
          modelUsed: model,
          fallbackMode: true,
          ...(warning ? { warning } : {}),
        };
      }
      // General Code Lab fallback for any other query
      return {
        explanation: `Great question about **${cleanTopic}**! This problem uses an efficient data structure to transform brute-force O(n²) into an optimal O(n) solution. Check the code in the editor and step through the visualizer to see each operation!`,
        mood: 'encouraging',
        code: {
          language: 'python',
          snippet: `# ${cleanTopic}: O(n) optimal solution\nseen = {}\nfor i, val in enumerate(nums):\n    complement = target - val\n    if complement in seen:\n        return [seen[complement], i]\n    seen[val] = i`,
        },
        suggestedFollowUps: [
          `Explain the intuition for ${cleanTopic}`,
          `What is the time complexity of ${cleanTopic}?`,
          `Key edge cases for ${cleanTopic}`,
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Check for out-of-scope questions (as per PDF requirements)
    const dsaKeywords = [
      'sort',
      'search',
      'tree',
      'graph',
      'array',
      'stack',
      'queue',
      'hash',
      'heap',
      'recursion',
      'dynamic programming',
      'complex',
      'big-o',
      'linked list',
      'bfs',
      'dfs',
      'dijkstra',
      'binary',
      'partition',
      'traversal',
      'algorithm',
      'data structure',
      'anagram',
      'duplicate',
      'two sum',
      'sliding window',
      'pointer',
      'string',
      'matrix',
      'edge case',
    ];
    const isDsa = isCodeLab || dsaKeywords.some((kw) => q.includes(kw));

    // If clearly non-DSA topic, steer back to DS&A persona
    if (!isDsa) {
      return {
        explanation:
          "I specialize in Data Structures and Algorithms! Let's focus our study on topics like Sorting, Trees, Graphs, or Dynamic Programming. What algorithm would you like to master today?",
        mood: 'encouraging',
        code: null,
        visualSequence: null,
        suggestedFollowUps: [
          'Explain how QuickSort works with a simple example',
          'How does Binary Search achieve O(log n) time complexity?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Contains Duplicate (hash set approach)
    if (
      q.includes('contains duplicate') ||
      q.includes('contain duplicate') ||
      (q.includes('duplicate') &&
        (q.includes('set') ||
          q.includes('seen') ||
          q.includes('nums') ||
          q.includes('check') ||
          q.includes('detect') ||
          q.includes('find') ||
          q.includes('complexit') ||
          q.includes('edge') ||
          q.includes('how') ||
          q.includes('explain') ||
          q.includes('intuition')))
    ) {
      if (q.includes('edge') || q.includes('case')) {
        return {
          explanation:
            'Key edge cases for Contains Duplicate: 1) Empty array → return False. 2) Single element → return False. 3) All identical elements like [3,3,3] → return True. 4) Large arrays where duplicate appears only at the very end — the set still finds it in O(n) time.',
          mood: 'thinking',
          code: {
            language: 'python',
            snippet:
              '# Edge case examples\ncontains_duplicate([])          # False\ncontains_duplicate([1])         # False\ncontains_duplicate([3, 3, 3])   # True\ncontains_duplicate([1,2,3,1])   # True (1 repeated)',
          },
          visualSequence: {
            type: 'array',
            title: 'Contains Duplicate: Edge Cases',
            steps: [
              {
                step: 1,
                action: 'highlight',
                description: 'Empty or single-element → always False',
                elements: [0],
              },
              {
                step: 2,
                action: 'compare',
                description: 'All same [3,3,3] → first repeat triggers True',
                elements: [0, 1],
              },
              {
                step: 3,
                action: 'highlight',
                description: 'Duplicate at end — set still detects in O(n)',
                elements: [3],
              },
            ],
          },
          suggestedFollowUps: [
            'What is the time and space complexity of Contains Duplicate?',
            'Can you walk through a step-by-step example?',
          ],
          modelUsed: model,
          fallbackMode: true,
          ...(warning ? { warning } : {}),
        };
      }
      if (
        q.includes('complex') ||
        q.includes('time') ||
        q.includes('space') ||
        q.includes('big-o')
      ) {
        return {
          explanation:
            'Contains Duplicate with a hash set runs in O(n) time — we visit each element exactly once. Space complexity is O(n) in the worst case (no duplicates, all n elements stored in the set). The brute-force O(n²) nested loop approach requires O(1) space but is far too slow for large inputs.',
          mood: 'explaining',
          code: {
            language: 'python',
            snippet:
              '# Time: O(n)  — one pass through nums\n# Space: O(n) — set stores up to n unique elements\ndef contains_duplicate(nums: list[int]) -> bool:\n    seen = set()\n    for num in nums:\n        if num in seen:   # O(1) hash lookup\n            return True\n        seen.add(num)     # O(1) insert\n    return False',
          },
          suggestedFollowUps: [
            'What are the key edge cases for Contains Duplicate?',
            'Can Contains Duplicate be solved with sorting instead?',
          ],
          modelUsed: model,
          fallbackMode: true,
          ...(warning ? { warning } : {}),
        };
      }
      // Default: explain intuition + walk through
      return {
        explanation:
          'Contains Duplicate uses a hash set as a memory of everything seen so far. For each number, we ask "have I seen you before?" in O(1). If yes → duplicate found, return True. If no → add to the set and keep going. We avoid an O(n²) brute-force check by trading a little memory for a massive speed boost.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet:
            'def contains_duplicate(nums: list[int]) -> bool:\n    seen = set()\n    for num in nums:\n        if num in seen:   # O(1) hash lookup\n            return True\n        seen.add(num)     # Mark as visited\n    return False\n\n# Example: nums = [1, 2, 3, 1]\n# i=0: seen={1}\n# i=1: seen={1,2}\n# i=2: seen={1,2,3}\n# i=3: 1 already in seen → return True ✓',
        },
        visualSequence: {
          type: 'array',
          title: 'Contains Duplicate: Hash Set Walk-Through',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Start: seen = {} (empty set)',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'num=1: not in seen → add. seen={1}',
              elements: [0],
            },
            {
              step: 3,
              action: 'compare',
              description: 'num=2: not in seen → add. seen={1,2}',
              elements: [1],
            },
            {
              step: 4,
              action: 'compare',
              description: 'num=3: not in seen → add. seen={1,2,3}',
              elements: [2],
            },
            {
              step: 5,
              action: 'highlight',
              description: 'num=1: already in seen! Return True ✓',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'What is the time and space complexity of Contains Duplicate?',
          'What are the key edge cases for Contains Duplicate?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Group Anagrams (hash map of sorted key → list of words)
    if (
      q.includes('group anagram') ||
      q.includes('group anagrams') ||
      q.includes('grouping anagram')
    ) {
      if (q.includes('complex') || q.includes('time') || q.includes('space')) {
        return {
          explanation:
            'Group Anagrams: Time complexity is O(n × k log k) where n is the number of strings and k is the maximum string length — sorting each string costs O(k log k). Space complexity is O(n × k) to store all strings in the hash map buckets.',
          mood: 'explaining',
          code: {
            language: 'python',
            snippet:
              '# Time:  O(n * k log k)  k = max string length\n# Space: O(n * k)         hash map of groups',
          },
          suggestedFollowUps: [
            'Can we avoid sorting and use character frequency counts instead?',
            'What are the edge cases for Group Anagrams?',
          ],
          modelUsed: model,
          fallbackMode: true,
          ...(warning ? { warning } : {}),
        };
      }
      return {
        explanation:
          'Group Anagrams groups words that are rearrangements of each other. The key insight: sorting any anagram produces the same canonical key. We use a hash map where each sorted key maps to a list of matching words. One pass through the input groups everything in O(n × k log k).',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet:
            'from collections import defaultdict\n\ndef group_anagrams(strs: list[str]) -> list[list[str]]:\n    groups = defaultdict(list)\n    for s in strs:\n        key = \'\'.join(sorted(s))  # canonical sorted key\n        groups[key].append(s)\n    return list(groups.values())\n\n# Example: ["eat","tea","tan","ate","nat","bat"]\n# "eat"→"aet", "tea"→"aet", "ate"→"aet" → same group\n# "tan"→"ant", "nat"→"ant"               → same group\n# "bat"→"abt"                            → solo group',
        },
        visualSequence: {
          type: 'hash',
          title: 'Group Anagrams: Sorted Key Bucketing',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: '"eat" → sorted → "aet" → bucket["aet"]',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: '"tea" → sorted → "aet" → same bucket!',
              elements: [1],
            },
            {
              step: 3,
              action: 'compare',
              description: '"tan" → sorted → "ant" → new bucket',
              elements: [2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Return all bucket value-lists',
              elements: [0, 1, 2],
            },
          ],
        },
        suggestedFollowUps: [
          'What is the time and space complexity of Group Anagrams?',
          'Can we use character frequency tuples as keys instead of sorting?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Celebrating student correct answer
    if (
      q.includes('did i get that right') ||
      q.includes('is that right') ||
      (q.includes('correct') && q.includes('so '))
    ) {
      return {
        explanation:
          'Spot on! That is a stellar summary. QuickSort partitions around a pivot with O(n log n) average time complexity. You have grasped the core divide-and-conquer concept brilliantly!',
        mood: 'celebrating',
        code: {
          language: 'python',
          snippet: `def quicksort(arr):\n    if len(arr) <= 1: return arr\n    pivot = arr[len(arr) // 2]\n    return quicksort([x for x in arr if x < pivot]) + [x for x in arr if x == pivot] + quicksort([x for x in arr if x > pivot])`,
        },
        visualSequence: {
          type: 'sorting',
          title: 'QuickSort Partition Verification',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Pivot chosen at middle index',
              elements: [3],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Left sub-array elements < pivot confirmed',
              elements: [0, 1],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Sorted order verified in O(n log n)',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'What is the worst-case space complexity?',
          'How does 3-way partitioning handle duplicates?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Follow-up: "What if the array is already sorted?"
    if (q.includes('already sorted') || (q.includes('sorted') && q.includes('what if'))) {
      return {
        explanation:
          'Great follow-up question! If the array is already sorted and we pick the last element as pivot, QuickSort hits its worst-case O(n²) time complexity because partitions become completely unbalanced.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def randomized_partition(arr, low, high):\n    import random\n    pivot_idx = random.randint(low, high)\n    arr[pivot_idx], arr[high] = arr[high], arr[pivot_idx]\n    return partition(arr, low, high)`,
        },
        visualSequence: {
          type: 'complexity_analysis',
          title: 'QuickSort Worst-Case: Sorted Input',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Smallest element selected as pivot',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'All elements larger: unbalanced partition of size n-1',
              elements: [0, 6],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'N levels deep gives O(n²) total comparisons',
              elements: [6],
            },
          ],
        },
        suggestedFollowUps: [
          'How does randomized pivot selection fix this?',
          'How does MergeSort compare on already sorted arrays?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Dijkstra
    if (q.includes('dijkstra')) {
      return {
        explanation:
          "Dijkstra's algorithm finds the shortest path on a non-negative weighted graph. Using a min-heap priority queue, it greedily finalizes the closest unvisited vertex step by step in O((V + E) log V) time.",
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `import heapq\n\ndef dijkstra(graph, start):\n    dist = {node: float('inf') for node in graph}\n    dist[start] = 0\n    pq = [(0, start)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d > dist[u]: continue\n        for v, weight in graph[u].items():\n            if dist[u] + weight < dist[v]:\n                dist[v] = dist[u] + weight\n                heapq.heappush(pq, (dist[v], v))\n    return dist`,
        },
        visualSequence: {
          type: 'graph',
          title: "Dijkstra's Shortest Path",
          steps: [
            {
              step: 1,
              action: 'visit',
              description: 'Initialize start node with distance 0',
              elements: ['A'],
            },
            {
              step: 2,
              action: 'relax',
              description: 'Relax adjacent edges and update priority queue',
              elements: ['A', 'B', 'C'],
            },
            {
              step: 3,
              action: 'visit',
              description: 'Extract min distance vertex and finalize shortest path',
              elements: ['F'],
            },
          ],
        },
        suggestedFollowUps: [
          'Why does Dijkstra fail with negative weights?',
          'How does the Bellman-Ford algorithm differ?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // BFS vs DFS
    if (q.includes('bfs') || q.includes('dfs')) {
      return {
        explanation:
          'BFS explores level-by-level using a FIFO queue, finding the shortest path on unweighted graphs. DFS plunges deep down one path using a LIFO stack before backtracking. Both run in O(V + E) time.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `from collections import deque\n\ndef bfs(graph, start):\n    visited, q = {start}, deque([start])\n    while q:\n        node = q.popleft()\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                q.append(neighbor)\n    return visited`,
        },
        visualSequence: {
          type: 'graph',
          title: 'BFS vs DFS Traversal',
          steps: [
            { step: 1, action: 'visit', description: 'Enqueue start node A', elements: ['A'] },
            {
              step: 2,
              action: 'traverse',
              description: 'Visit all immediate neighbors at depth 1',
              elements: ['B', 'C'],
            },
            {
              step: 3,
              action: 'visit',
              description: 'Process level 2 neighbors until queue is empty',
              elements: ['D', 'E', 'F'],
            },
          ],
        },
        suggestedFollowUps: [
          'When is DFS preferred over BFS?',
          'How does A* search improve upon BFS?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // AVL Tree
    if (q.includes('avl') || q.includes('rotation')) {
      return {
        explanation:
          'An AVL Tree is a self-balancing binary search tree where the balance factor of any node is strictly between -1 and +1. When an insertion causes unbalance, single or double rotations restore O(log n) height.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def right_rotate(y):\n    x = y.left\n    T2 = x.right\n    x.right = y\n    y.left = T2\n    y.height = 1 + max(get_height(y.left), get_height(y.right))\n    x.height = 1 + max(get_height(x.left), get_height(x.right))\n    return x`,
        },
        visualSequence: {
          type: 'tree',
          title: 'AVL Tree Rotations',
          steps: [
            {
              step: 1,
              action: 'insert',
              description: 'Insert new node in BST order',
              elements: [5],
            },
            {
              step: 2,
              action: 'highlight',
              description: 'Detect balance factor > 1 at ancestor',
              elements: [2],
            },
            {
              step: 3,
              action: 'swap',
              description: 'Execute rotation to restore height balance',
              elements: [1, 2],
            },
          ],
        },
        suggestedFollowUps: [
          'What are the four rotation cases?',
          'How does a Red-Black Tree differ from an AVL Tree?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Trie Data Structure
    if (q.includes('trie')) {
      return {
        explanation:
          'A Trie, or prefix tree, stores strings character-by-character along tree paths. It enables O(L) search, insert, and prefix lookup proportional to word length L, powering fast autocomplete and spellcheck.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `class TrieNode:\n    def __init__(self):\n        self.children = {}\n        self.is_end = False\n\nclass Trie:\n    def __init__(self):\n        self.root = TrieNode()\n    def insert(self, word):\n        node = self.root\n        for ch in word:\n            if ch not in node.children: node.children[ch] = TrieNode()\n            node = node.children[ch]\n        node.is_end = True`,
        },
        visualSequence: {
          type: 'tree',
          title: 'Trie Prefix Search',
          steps: [
            { step: 1, action: 'highlight', description: 'Start at root node', elements: [0] },
            {
              step: 2,
              action: 'traverse',
              description: 'Traverse character path for prefix',
              elements: [1, 2],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Prefix matched successfully in O(L)',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'How does a Radix tree compress Trie memory?',
          'How is a Trie used in IP routing lookup?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Binary Search Tree / General Tree
    if (q.includes('bst') || q.includes('tree')) {
      return {
        explanation:
          'A Binary Search Tree maintains the invariant that all left subtree keys are smaller, and all right subtree keys are larger. Searching, inserting, and deleting run in O(h) time proportional to tree height.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def search_bst(root, val):\n    if not root or root.val == val: return root\n    if val < root.val: return search_bst(root.left, val)\n    return search_bst(root.right, val)`,
        },
        visualSequence: {
          type: 'tree',
          title: 'Binary Search Tree Operations',
          steps: [
            { step: 1, action: 'highlight', description: 'Examine root node 50', elements: [50] },
            {
              step: 2,
              action: 'traverse',
              description: 'Target < 50: branch left to node 30',
              elements: [30],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Target confirmed at node in O(log n)',
              elements: [40],
            },
          ],
        },
        suggestedFollowUps: [
          'What is the time complexity if the tree becomes degenerate?',
          'How does in-order traversal yield sorted keys?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Dynamic Programming - Fibonacci
    if (q.includes('fibonacci')) {
      return {
        explanation:
          'Dynamic programming eliminates redundant recalculation by storing subproblem answers. In Fibonacci, computing fib(n) bottom-up takes O(n) time and O(1) memory, turning exponential O(2^n) recursion into linear.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def fib_dp(n):\n    if n <= 1: return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b`,
        },
        visualSequence: {
          type: 'dp',
          title: 'Fibonacci DP Tabulation',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Base cases: fib(0)=0, fib(1)=1',
              elements: [0, 1],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Sum preceding two terms to produce fib(2)=1',
              elements: [1, 2],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Result computed in O(n) time with O(1) space',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'What is top-down memoization vs bottom-up tabulation?',
          'How can matrix exponentiation solve Fibonacci in O(log n)?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // 0/1 Knapsack Problem
    if (q.includes('knapsack')) {
      return {
        explanation:
          'The 0/1 Knapsack problem asks for the maximum item value that fits into a weight capacity W. For each item, we either include it or exclude it, building an optimal subproblem DP table in O(n * W) pseudo-polynomial time.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def knapsack(W, wt, val, n):\n    dp = [[0] * (W + 1) for _ in range(n + 1)]\n    for i in range(1, n + 1):\n        for w in range(1, W + 1):\n            if wt[i-1] <= w:\n                dp[i][w] = max(val[i-1] + dp[i-1][w-wt[i-1]], dp[i-1][w])\n            else: dp[i][w] = dp[i-1][w]\n    return dp[n][W]`,
        },
        visualSequence: {
          type: 'dp',
          title: '0/1 Knapsack DP Table',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Initialize DP table row 0 with zero values',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Evaluate max(include item, exclude item)',
              elements: [1, 2],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Optimal value achieved at dp[n][W]',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'How can we optimize space from O(n * W) to O(W)?',
          'Why is Knapsack NP-complete if fractional items are allowed?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Two Pointers & Sliding Window
    if (q.includes('sliding window') || q.includes('two pointer') || q.includes('pointer')) {
      return {
        explanation:
          'The two pointers and sliding window techniques optimize nested O(n²) loops into linear O(n) by maintaining a valid window or bounding pointers that adjust monotonically based on constraints.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def max_sub_array_len(nums, k):\n    left = total = max_len = 0\n    for right in range(len(nums)):\n        total += nums[right]\n        while total > k and left <= right:\n            total -= nums[left]\n            left += 1\n        max_len = max(max_len, right - left + 1)\n    return max_len`,
        },
        visualSequence: {
          type: 'array',
          title: 'Sliding Window Expansion & Contraction',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Expand right pointer to include element',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Evaluate window sum against constraint k',
              elements: [0, 1],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'Contract left pointer when constraint is violated in O(n)',
              elements: [1],
            },
          ],
        },
        suggestedFollowUps: [
          'How does the fast & slow pointer cycle detection work?',
          'When does sliding window require auxiliary hash tables?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // MergeSort
    if (q.includes('merge') || (q.includes('sort') && !q.includes('quick'))) {
      return {
        explanation:
          'MergeSort is a divide-and-conquer algorithm that recursively splits an array in halves down to single items, then merges sorted arrays back together in guaranteed O(n log n) time and O(n) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def merge_sort(arr):\n    if len(arr) <= 1: return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)`,
        },
        visualSequence: {
          type: 'sorting',
          title: 'MergeSort Divide & Conquer',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Divide array into two equal halves',
              elements: [0, 3],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Recursively sort each independent half',
              elements: [0, 1],
            },
            {
              step: 3,
              action: 'swap',
              description: 'Merge sorted sub-arrays in O(n) linear scan',
              elements: [0, 6],
            },
          ],
        },
        suggestedFollowUps: [
          'Why is MergeSort preferred over QuickSort for linked lists?',
          'How does TimSort leverage MergeSort?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // QuickSort default example (PDF Page 1 example)
    if (q.includes('quick') || q.includes('quicksort')) {
      return {
        explanation:
          'Quick sort works by partitioning an array around a pivot element. Elements smaller than the pivot move left, and larger elements move right, then we recursively sort both halves.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)`,
        },
        visualSequence: {
          type: 'sorting',
          title: 'QuickSort Partitioning Animation',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Array: [38, 27, 43, 3, 9, 82, 10]. Pivot selected: 10',
              elements: [6],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Compare 38 with pivot 10: 38 > 10, keep in right partition',
              elements: [0, 6],
            },
            {
              step: 3,
              action: 'compare',
              description: 'Compare 3 with pivot 10: 3 <= 10, swap to left partition',
              elements: [3, 6],
            },
            {
              step: 4,
              action: 'swap',
              description: 'Swapped 38 and 3: [3, 27, 43, 38, 9, 82, 10]',
              elements: [0, 3],
            },
            {
              step: 5,
              action: 'highlight',
              description: 'Pivot 10 placed at boundary. Partitions: [3, 9] and [38, 27, 82, 43]',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'What if the array is already sorted?',
          'What is the space complexity of QuickSort?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // ─── ARRAYS ──────────────────────────────────────────────────────────────

    // Best Time to Buy and Sell Stock
    if (
      q.includes('buy and sell stock') ||
      q.includes('max profit') ||
      q.includes('best time') ||
      q.includes('stock')
    ) {
      return {
        explanation:
          'Track a running minimum price and, at each step, compute the profit if you sold today. One pass gives you the best profit in O(n) time with O(1) space — no need for nested loops.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def max_profit(prices):\n    min_price = float('inf')\n    max_profit = 0\n    for price in prices:\n        min_price = min(min_price, price)\n        max_profit = max(max_profit, price - min_price)\n    return max_profit`,
        },
        visualSequence: {
          type: 'array',
          title: 'Best Time to Buy and Sell Stock',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Initialize min_price=∞, max_profit=0',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Update min_price with current price',
              elements: [1],
            },
            {
              step: 3,
              action: 'compare',
              description: 'Compute profit = price − min_price',
              elements: [2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Update max_profit if profit is higher',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'What if you can make multiple transactions?',
          'How would you handle the case where prices only decrease?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Valid Anagram
    if (q.includes('valid anagram') || (q.includes('anagram') && !q.includes('group'))) {
      if (
        q.includes('complex') ||
        q.includes('time') ||
        q.includes('space') ||
        q.includes('big-o')
      ) {
        return {
          explanation:
            'Valid Anagram with a frequency array runs in O(n) time — we do one linear pass over string s and one pass over string t. Space complexity is O(1) auxiliary space because the alphabet size is fixed (26 lowercase English letters), regardless of how large the input strings are.',
          mood: 'explaining',
          code: {
            language: 'python',
            snippet:
              "# Time: O(n) — two passes of length n\n# Space: O(1) — fixed 26-element array\ndef is_anagram(s: str, t: str) -> bool:\n    if len(s) != len(t): return False\n    count = [0] * 26\n    for c in s: count[ord(c) - ord('a')] += 1\n    for c in t: count[ord(c) - ord('a')] -= 1\n    return all(x == 0 for x in count)",
          },
          visualSequence: {
            type: 'array',
            title: 'Valid Anagram: Complexity Analysis',
            steps: [
              {
                step: 1,
                action: 'highlight',
                description: 'Fixed 26-slot counter array → O(1) space',
                elements: [0],
              },
              {
                step: 2,
                action: 'compare',
                description: 'Linear scan of both strings → O(n) time',
                elements: [0, 1],
              },
              {
                step: 3,
                action: 'highlight',
                description: 'O(1) alphabet check finishes validation',
                elements: [1],
              },
            ],
          },
          suggestedFollowUps: [
            'What if the input contains Unicode characters?',
            'What are the key edge cases for Valid Anagram?',
          ],
          modelUsed: model,
          fallbackMode: true,
          ...(warning ? { warning } : {}),
        };
      }
      return {
        explanation:
          'Two strings are anagrams if they have identical character frequencies. Count characters of the first string in a 26-slot array, then decrement for the second — if all slots are zero, they match. O(n) time, O(1) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def is_anagram(s, t):\n    if len(s) != len(t):\n        return False\n    count = [0] * 26\n    for c in s:\n        count[ord(c) - ord('a')] += 1\n    for c in t:\n        count[ord(c) - ord('a')] -= 1\n    return all(x == 0 for x in count)`,
        },
        visualSequence: {
          type: 'array',
          title: 'Valid Anagram: Frequency Count',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Build frequency array from string s',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Decrement frequencies using string t',
              elements: [1],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'All zeros → valid anagram!',
              elements: [0, 1],
            },
          ],
        },
        suggestedFollowUps: [
          'How would you handle Unicode characters beyond a-z?',
          'How does this compare to sorting both strings?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Top K Frequent Elements
    if (q.includes('top k frequent') || q.includes('k frequent') || q.includes('most frequent')) {
      return {
        explanation:
          'Count frequencies with a hash map, then maintain a min-heap of size k. Each insertion costs O(log k), yielding O(n log k) overall — much faster than sorting when k is small.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `import heapq\nfrom collections import Counter\n\ndef top_k_frequent(nums, k):\n    freq = Counter(nums)\n    # min-heap: (frequency, element)\n    return heapq.nlargest(k, freq.keys(), key=freq.get)`,
        },
        visualSequence: {
          type: 'array',
          title: 'Top K Frequent Elements',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Count frequencies with Counter',
              elements: [0],
            },
            {
              step: 2,
              action: 'insert',
              description: 'Push into min-heap of size k',
              elements: [1],
            },
            {
              step: 3,
              action: 'compare',
              description: 'Evict minimum if heap exceeds k',
              elements: [2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Return remaining k elements',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'Can we solve this in O(n) using bucket sort?',
          'What is the space complexity of this approach?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Product of Array Except Self
    if (
      q.includes('product of array') ||
      q.includes('product except self') ||
      q.includes('except self')
    ) {
      return {
        explanation:
          'Build a prefix-product array left to right, then multiply a running postfix product right to left — giving each position the product of all other elements in O(n) time and O(1) extra space (output array not counted).',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def product_except_self(nums):\n    n = len(nums)\n    res = [1] * n\n    # prefix pass\n    prefix = 1\n    for i in range(n):\n        res[i] = prefix\n        prefix *= nums[i]\n    # postfix pass\n    postfix = 1\n    for i in range(n - 1, -1, -1):\n        res[i] *= postfix\n        postfix *= nums[i]\n    return res`,
        },
        visualSequence: {
          type: 'array',
          title: 'Product of Array Except Self',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Left pass: store prefix products',
              elements: [0, 1, 2, 3],
            },
            {
              step: 2,
              action: 'traverse',
              description: 'Right pass: multiply running postfix',
              elements: [3, 2, 1, 0],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Each res[i] = prefix[i] × postfix[i]',
              elements: [0, 1, 2, 3],
            },
          ],
        },
        suggestedFollowUps: [
          'What if division were allowed — how would you use it?',
          'How do you handle zeros in the input array?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Longest Consecutive Sequence
    if (q.includes('longest consecutive') || q.includes('consecutive sequence')) {
      return {
        explanation:
          'Load all numbers into a hash set. For each number, only start counting if num−1 is absent (i.e., it is a sequence start). Extend the streak while consecutive numbers exist. O(n) time, O(n) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def longest_consecutive(nums):\n    num_set = set(nums)\n    best = 0\n    for n in num_set:\n        if n - 1 not in num_set:  # sequence start\n            cur = n\n            streak = 1\n            while cur + 1 in num_set:\n                cur += 1\n                streak += 1\n            best = max(best, streak)\n    return best`,
        },
        visualSequence: {
          type: 'array',
          title: 'Longest Consecutive Sequence',
          steps: [
            {
              step: 1,
              action: 'insert',
              description: 'Load all values into hash set',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'num−1 absent → sequence start found',
              elements: [1],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'Extend streak while num+1 exists',
              elements: [2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Update best streak length',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'Why do we skip numbers where num−1 exists?',
          'How would sorting solve this and what is its complexity?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Max Subarray — Kadane's Algorithm
    if (
      q.includes('kadane') ||
      q.includes('max subarray') ||
      q.includes('maximum subarray') ||
      q.includes('maximum sum subarray')
    ) {
      return {
        explanation:
          "Kadane's algorithm sweeps once: at each element, decide whether to extend the current subarray or start fresh. Track the global max along the way. O(n) time, O(1) space.",
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def max_subarray(nums):\n    cur_sum = max_sum = nums[0]\n    for x in nums[1:]:\n        cur_sum = max(x, cur_sum + x)\n        max_sum = max(max_sum, cur_sum)\n    return max_sum`,
        },
        visualSequence: {
          type: 'array',
          title: "Kadane's Max Subarray",
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Initialize cur_sum and max_sum to nums[0]',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Extend or restart: max(x, cur_sum + x)',
              elements: [1],
            },
            { step: 3, action: 'compare', description: 'Update global max_sum', elements: [2] },
            {
              step: 4,
              action: 'highlight',
              description: 'Final max_sum is the answer',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'How do you also return the subarray indices, not just the sum?',
          'How does this extend to a 2-D matrix (maximum sum rectangle)?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Container With Most Water
    if (
      q.includes('container with most water') ||
      q.includes('most water') ||
      q.includes('container water')
    ) {
      return {
        explanation:
          'Place two pointers at opposite ends of the height array. The area is limited by the shorter bar, so move that pointer inward each step — maximizing the chance of finding a taller bar. O(n) time, O(1) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def max_area(height):\n    left, right = 0, len(height) - 1\n    best = 0\n    while left < right:\n        area = min(height[left], height[right]) * (right - left)\n        best = max(best, area)\n        if height[left] < height[right]:\n            left += 1\n        else:\n            right -= 1\n    return best`,
        },
        visualSequence: {
          type: 'array',
          title: 'Container With Most Water',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Place left=0, right=n−1 pointers',
              elements: [0, 7],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Calculate area = min(h[l],h[r]) × width',
              elements: [0, 7],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'Move the shorter-bar pointer inward',
              elements: [1],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Repeat until pointers meet',
              elements: [3, 5],
            },
          ],
        },
        suggestedFollowUps: [
          'Why is it safe to move the shorter pointer inward?',
          'Does this problem relate to Trapping Rain Water?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Trapping Rain Water
    if (q.includes('trapping rain') || q.includes('trap rain') || q.includes('rain water')) {
      return {
        explanation:
          'Use two pointers with running left-max and right-max. The water at any bar equals min(leftMax, rightMax) − bar height. Process the side with the smaller max first. O(n) time, O(1) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def trap(height):\n    left, right = 0, len(height) - 1\n    left_max = right_max = 0\n    water = 0\n    while left < right:\n        if height[left] <= height[right]:\n            if height[left] >= left_max:\n                left_max = height[left]\n            else:\n                water += left_max - height[left]\n            left += 1\n        else:\n            if height[right] >= right_max:\n                right_max = height[right]\n            else:\n                water += right_max - height[right]\n            right -= 1\n    return water`,
        },
        visualSequence: {
          type: 'array',
          title: 'Trapping Rain Water',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Initialize left=0, right=n−1, maxes=0',
              elements: [0, 11],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Process side with smaller max first',
              elements: [0],
            },
            {
              step: 3,
              action: 'insert',
              description: 'water += leftMax − height[left]',
              elements: [1],
            },
            { step: 4, action: 'traverse', description: 'Advance pointer inward', elements: [2] },
          ],
        },
        suggestedFollowUps: [
          'How does the prefix/suffix max array approach differ?',
          'What is the relationship between this and Container With Most Water?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Rotate Array
    if (q.includes('rotate array') || q.includes('rotate by k')) {
      return {
        explanation:
          'Reverse the entire array, then reverse the first k elements, then reverse the rest. Three in-place reversals achieve rotation in O(n) time and O(1) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def rotate(nums, k):\n    n = len(nums)\n    k %= n\n    def reverse(l, r):\n        while l < r:\n            nums[l], nums[r] = nums[r], nums[l]\n            l += 1; r -= 1\n    reverse(0, n - 1)\n    reverse(0, k - 1)\n    reverse(k, n - 1)`,
        },
        visualSequence: {
          type: 'array',
          title: 'Rotate Array by k Steps',
          steps: [
            { step: 1, action: 'swap', description: 'Reverse entire array', elements: [0, 6] },
            { step: 2, action: 'swap', description: 'Reverse first k elements', elements: [0, 2] },
            {
              step: 3,
              action: 'swap',
              description: 'Reverse remaining n−k elements',
              elements: [3, 6],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Array is now rotated by k',
              elements: [0, 1, 2, 3],
            },
          ],
        },
        suggestedFollowUps: [
          'How do you handle k larger than n?',
          'What is the difference between left and right rotation?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Find the Duplicate Number
    if (
      q.includes('find the duplicate') ||
      q.includes('find duplicate number') ||
      (q.includes('duplicate') && q.includes('floyd')) ||
      (q.includes('duplicate') && q.includes('cycle'))
    ) {
      return {
        explanation:
          'Treat each value as a "next" pointer — this creates a linked list with a cycle whose entry point is the duplicate. Floyd\'s tortoise-and-hare detects that cycle in O(n) time and O(1) space, without modifying the array.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def find_duplicate(nums):\n    slow = fast = nums[0]\n    # Phase 1: detect cycle\n    while True:\n        slow = nums[slow]\n        fast = nums[nums[fast]]\n        if slow == fast:\n            break\n    # Phase 2: find entry point\n    slow = nums[0]\n    while slow != fast:\n        slow = nums[slow]\n        fast = nums[fast]\n    return slow`,
        },
        visualSequence: {
          type: 'graph',
          title: "Find Duplicate: Floyd's Cycle Detection",
          steps: [
            {
              step: 1,
              action: 'traverse',
              description: 'slow moves 1 step, fast moves 2 steps',
              elements: [0, 1],
            },
            {
              step: 2,
              action: 'compare',
              description: 'They meet inside the cycle',
              elements: [2],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Reset slow to start, advance both 1 step',
              elements: [0, 2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Meeting point is the duplicate number',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'Why does resetting slow to the start reveal the cycle entry?',
          'Can this algorithm find more than one duplicate?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // First Missing Positive
    if (q.includes('first missing positive') || q.includes('missing positive')) {
      return {
        explanation:
          'Place each number in its correct index slot (nums[i] → index nums[i]−1) using cycle sort. Then scan for the first index where nums[i] ≠ i+1. O(n) time, O(1) space.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def first_missing_positive(nums):\n    n = len(nums)\n    for i in range(n):\n        while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:\n            j = nums[i] - 1\n            nums[i], nums[j] = nums[j], nums[i]\n    for i in range(n):\n        if nums[i] != i + 1:\n            return i + 1\n    return n + 1`,
        },
        visualSequence: {
          type: 'array',
          title: 'First Missing Positive: Index Placement',
          steps: [
            {
              step: 1,
              action: 'swap',
              description: 'Swap nums[i] to its correct index position',
              elements: [0, 2],
            },
            {
              step: 2,
              action: 'traverse',
              description: 'Repeat until each slot holds its value',
              elements: [1],
            },
            {
              step: 3,
              action: 'compare',
              description: 'Scan for nums[i] ≠ i+1',
              elements: [0, 1, 2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'First mismatch index+1 is the answer',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'Why can we ignore numbers outside [1, n]?',
          'How would a hash set approach differ in space complexity?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Majority Element — Boyer-Moore Voting
    if (
      q.includes('majority element') ||
      q.includes('boyer-moore') ||
      q.includes('voting algorithm')
    ) {
      return {
        explanation:
          'Boyer-Moore Voting: maintain a candidate and a counter. Increment on a match, decrement otherwise; when counter hits 0 pick a new candidate. The majority element (appearing > n/2 times) always survives. O(n) time, O(1) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def majority_element(nums):\n    candidate, count = None, 0\n    for num in nums:\n        if count == 0:\n            candidate = num\n        count += 1 if num == candidate else -1\n    return candidate`,
        },
        visualSequence: {
          type: 'array',
          title: 'Boyer-Moore Majority Vote',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Pick first element as candidate, count=1',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Match → count++, mismatch → count--',
              elements: [1],
            },
            {
              step: 3,
              action: 'insert',
              description: 'count=0 → new candidate elected',
              elements: [2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Final candidate is the majority element',
              elements: [5],
            },
          ],
        },
        suggestedFollowUps: [
          'What if no majority element is guaranteed — how do you verify?',
          'How does this extend to finding elements appearing > n/3 times?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // ─── LINKED LIST ─────────────────────────────────────────────────────────

    // Reverse Linked List
    if (q.includes('reverse linked list')) {
      return {
        explanation:
          'Walk the list with three pointers: prev, curr, and next. At each step, flip curr.next to prev, then advance all three forward. O(n) time, O(1) space — fully in-place.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def reverse_list(head):\n    prev = None\n    curr = head\n    while curr:\n        nxt = curr.next\n        curr.next = prev\n        prev = curr\n        curr = nxt\n    return prev`,
        },
        visualSequence: {
          type: 'graph',
          title: 'Reverse Linked List',
          steps: [
            { step: 1, action: 'highlight', description: 'prev=None, curr=head', elements: [0] },
            {
              step: 2,
              action: 'traverse',
              description: 'Save next, flip curr.next → prev',
              elements: [0, 1],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'Advance prev=curr, curr=next',
              elements: [1, 2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'prev is the new head when curr=None',
              elements: [4],
            },
          ],
        },
        suggestedFollowUps: [
          'How would you reverse a linked list recursively?',
          'How do you reverse only a subrange [left, right] of the list?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Palindrome Linked List
    if (q.includes('palindrome linked list')) {
      return {
        explanation:
          'Find the midpoint with slow/fast pointers, reverse the second half in-place, then compare both halves node by node. O(n) time, O(1) extra space.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def is_palindrome(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n    # reverse second half\n    prev = None\n    while slow:\n        nxt = slow.next\n        slow.next = prev\n        prev = slow\n        slow = nxt\n    # compare\n    left, right = head, prev\n    while right:\n        if left.val != right.val:\n            return False\n        left = left.next\n        right = right.next\n    return True`,
        },
        visualSequence: {
          type: 'graph',
          title: 'Palindrome Linked List',
          steps: [
            {
              step: 1,
              action: 'traverse',
              description: 'Slow/fast pointer finds midpoint',
              elements: [0, 1],
            },
            {
              step: 2,
              action: 'swap',
              description: 'Reverse second half in-place',
              elements: [2, 3, 4],
            },
            {
              step: 3,
              action: 'compare',
              description: 'Compare front half vs reversed half',
              elements: [0, 4],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'All values equal → palindrome!',
              elements: [0, 1, 2],
            },
          ],
        },
        suggestedFollowUps: [
          'How would you solve this without modifying the list?',
          'What is the space complexity if you use a stack instead?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Merge Two Sorted Lists
    if (q.includes('merge two sorted') || q.includes('merge two lists')) {
      return {
        explanation:
          'Use a dummy head node. Compare the current nodes of both lists, append the smaller one, and advance that pointer. Continue until one list is exhausted, then attach the rest. O(n+m) time, O(1) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def merge_two_lists(l1, l2):\n    dummy = ListNode(0)\n    cur = dummy\n    while l1 and l2:\n        if l1.val <= l2.val:\n            cur.next = l1\n            l1 = l1.next\n        else:\n            cur.next = l2\n            l2 = l2.next\n        cur = cur.next\n    cur.next = l1 or l2\n    return dummy.next`,
        },
        visualSequence: {
          type: 'graph',
          title: 'Merge Two Sorted Lists',
          steps: [
            { step: 1, action: 'highlight', description: 'Create dummy head node', elements: [0] },
            {
              step: 2,
              action: 'compare',
              description: 'Compare l1.val and l2.val',
              elements: [1, 2],
            },
            {
              step: 3,
              action: 'insert',
              description: 'Append smaller node, advance pointer',
              elements: [1],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Attach remaining list tail',
              elements: [4],
            },
          ],
        },
        suggestedFollowUps: [
          'How would you merge k sorted lists efficiently?',
          'Can you merge two sorted lists recursively?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Remove Nth Node from End
    if (q.includes('nth node from end') || q.includes('remove nth')) {
      return {
        explanation:
          'Advance a fast pointer n+1 steps ahead, then move both pointers together until fast reaches null. The slow pointer now sits just before the node to remove. O(n) time, O(1) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def remove_nth_from_end(head, n):\n    dummy = ListNode(0, head)\n    fast = slow = dummy\n    for _ in range(n + 1):\n        fast = fast.next\n    while fast:\n        fast = fast.next\n        slow = slow.next\n    slow.next = slow.next.next\n    return dummy.next`,
        },
        visualSequence: {
          type: 'graph',
          title: 'Remove Nth Node from End',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Advance fast pointer n+1 steps',
              elements: [0, 3],
            },
            {
              step: 2,
              action: 'traverse',
              description: 'Move both pointers until fast=null',
              elements: [1, 4],
            },
            {
              step: 3,
              action: 'delete',
              description: 'slow.next = slow.next.next skips node',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'Why do we advance fast n+1 steps instead of n?',
          'How does a dummy head simplify edge cases?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Detect Cycle in Linked List
    if (
      q.includes('detect cycle') ||
      q.includes('cycle detection') ||
      q.includes('linked list cycle') ||
      q.includes('tortoise and hare') ||
      (q.includes('floyd') && !q.includes('duplicate'))
    ) {
      return {
        explanation:
          "Floyd's cycle detection: slow pointer moves one step, fast pointer moves two steps. If they ever meet, a cycle exists. Otherwise fast reaches null (no cycle). O(n) time, O(1) space.",
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def has_cycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow == fast:\n            return True\n    return False`,
        },
        visualSequence: {
          type: 'graph',
          title: "Detect Cycle: Floyd's Algorithm",
          steps: [
            {
              step: 1,
              action: 'traverse',
              description: 'slow moves 1 step, fast moves 2 steps',
              elements: [0, 1],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Check if slow == fast (cycle found)',
              elements: [2],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'fast reaches null → no cycle',
              elements: [5],
            },
          ],
        },
        suggestedFollowUps: [
          'How do you find the start of the cycle, not just detect it?',
          'What is the mathematical proof that slow and fast always meet?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // LRU Cache
    if (q.includes('lru cache') || q.includes('lru')) {
      return {
        explanation:
          'Combine a hash map with a doubly-linked list. The map gives O(1) lookup; the list maintains recency order. On every get or put, move the node to the front. Evict from the tail when capacity is exceeded.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `from collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, capacity):\n        self.cap = capacity\n        self.cache = OrderedDict()\n\n    def get(self, key):\n        if key not in self.cache:\n            return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n\n    def put(self, key, value):\n        if key in self.cache:\n            self.cache.move_to_end(key)\n        self.cache[key] = value\n        if len(self.cache) > self.cap:\n            self.cache.popitem(last=False)`,
        },
        visualSequence: {
          type: 'graph',
          title: 'LRU Cache Operations',
          steps: [
            {
              step: 1,
              action: 'insert',
              description: 'put(1,1): insert at front of list',
              elements: [0],
            },
            { step: 2, action: 'insert', description: 'put(2,2): insert at front', elements: [1] },
            {
              step: 3,
              action: 'traverse',
              description: 'get(1): move key-1 to front',
              elements: [0],
            },
            {
              step: 4,
              action: 'delete',
              description: 'Capacity exceeded: evict LRU from tail',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'How would you implement LRU without OrderedDict (raw doubly-linked list)?',
          'What is the difference between LRU and LFU caching?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Add Two Numbers as Linked Lists
    if (q.includes('add two numbers') || q.includes('add two linked')) {
      return {
        explanation:
          'Traverse both lists simultaneously, summing digits with a carry. Append each digit (sum % 10) to a result list using a dummy head, and carry (sum // 10) forward. O(max(n,m)) time, O(max(n,m)) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def add_two_numbers(l1, l2):\n    dummy = ListNode(0)\n    cur = dummy\n    carry = 0\n    while l1 or l2 or carry:\n        v1 = l1.val if l1 else 0\n        v2 = l2.val if l2 else 0\n        total = v1 + v2 + carry\n        carry = total // 10\n        cur.next = ListNode(total % 10)\n        cur = cur.next\n        if l1: l1 = l1.next\n        if l2: l2 = l2.next\n    return dummy.next`,
        },
        visualSequence: {
          type: 'graph',
          title: 'Add Two Numbers as Linked Lists',
          steps: [
            {
              step: 1,
              action: 'compare',
              description: 'Add l1.val + l2.val + carry',
              elements: [0, 1],
            },
            {
              step: 2,
              action: 'insert',
              description: 'Append (sum % 10) node to result',
              elements: [2],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'carry = sum // 10, advance both pointers',
              elements: [1, 2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Handle remaining carry as extra node',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'How would you handle lists storing digits in forward order?',
          'What if numbers have different lengths?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Intersection of Two Linked Lists
    if (q.includes('intersection of two linked') || q.includes('linked list intersection')) {
      return {
        explanation:
          'Walk pointer A through list A then list B, and pointer B through list B then list A. They travel the same total distance, so they meet at the intersection node (or both reach null together if no intersection). O(n+m) time, O(1) space.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def get_intersection_node(headA, headB):\n    a, b = headA, headB\n    while a != b:\n        a = a.next if a else headB\n        b = b.next if b else headA\n    return a`,
        },
        visualSequence: {
          type: 'graph',
          title: 'Intersection of Two Linked Lists',
          steps: [
            {
              step: 1,
              action: 'traverse',
              description: 'Both pointers start at their own heads',
              elements: [0, 1],
            },
            {
              step: 2,
              action: 'traverse',
              description: 'On reaching null, switch to other list head',
              elements: [2, 3],
            },
            {
              step: 3,
              action: 'compare',
              description: 'Pointers meet at intersection node',
              elements: [4],
            },
          ],
        },
        suggestedFollowUps: [
          'Why does switching lists guarantee they meet at the intersection?',
          'What if the lists do not intersect — what do the pointers both equal?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Reorder List
    if (q.includes('reorder list')) {
      return {
        explanation:
          'Find the midpoint, reverse the second half, then interleave nodes from the first and reversed-second halves. Three O(n) passes, O(1) extra space.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def reorder_list(head):\n    # Step 1: find mid\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n    # Step 2: reverse second half\n    prev, cur = None, slow.next\n    slow.next = None\n    while cur:\n        nxt = cur.next\n        cur.next = prev\n        prev = cur\n        cur = nxt\n    # Step 3: merge\n    first, second = head, prev\n    while second:\n        tmp1, tmp2 = first.next, second.next\n        first.next = second\n        second.next = tmp1\n        first, second = tmp1, tmp2`,
        },
        visualSequence: {
          type: 'graph',
          title: 'Reorder Linked List',
          steps: [
            {
              step: 1,
              action: 'traverse',
              description: 'Find midpoint with slow/fast pointers',
              elements: [0, 2],
            },
            {
              step: 2,
              action: 'swap',
              description: 'Reverse second half in-place',
              elements: [3, 4, 5],
            },
            {
              step: 3,
              action: 'insert',
              description: 'Interleave: first → last → second → second-last…',
              elements: [0, 5, 1, 4],
            },
          ],
        },
        suggestedFollowUps: [
          'How does this differ from rotating a linked list?',
          'Can you do this recursively, and what would the space complexity be?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Odd Even Linked List
    if (q.includes('odd even linked')) {
      return {
        explanation:
          'Separate nodes at odd indices into one chain and even indices into another, then attach the even chain after the odd chain. O(n) time, O(1) extra space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def odd_even_list(head):\n    if not head:\n        return head\n    odd = head\n    even = head.next\n    even_head = even\n    while even and even.next:\n        odd.next = even.next\n        odd = odd.next\n        even.next = odd.next\n        even = even.next\n    odd.next = even_head\n    return head`,
        },
        visualSequence: {
          type: 'graph',
          title: 'Odd Even Linked List',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Identify odd and even index chains',
              elements: [0, 1],
            },
            {
              step: 2,
              action: 'traverse',
              description: 'Advance odd and even pointers alternately',
              elements: [2, 3],
            },
            {
              step: 3,
              action: 'insert',
              description: 'Link even_head after the odd chain',
              elements: [4],
            },
          ],
        },
        suggestedFollowUps: [
          'What happens if the list has only one or two nodes?',
          'How is "odd/even by index" different from "odd/even by value"?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // ─── STACK ────────────────────────────────────────────────────────────────

    // Valid Parentheses
    if (q.includes('valid parentheses') || q.includes('parentheses') || q.includes('bracket')) {
      return {
        explanation:
          'Push every opening bracket onto a stack. When you see a closing bracket, pop the stack and check for a match. If the stack is empty at the end, the string is valid. O(n) time and space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def is_valid(s):\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for ch in s:\n        if ch in mapping:\n            top = stack.pop() if stack else '#'\n            if mapping[ch] != top:\n                return False\n        else:\n            stack.append(ch)\n    return not stack`,
        },
        visualSequence: {
          type: 'array',
          title: 'Valid Parentheses Stack',
          steps: [
            {
              step: 1,
              action: 'insert',
              description: 'Push opening bracket onto stack',
              elements: [0],
            },
            {
              step: 2,
              action: 'insert',
              description: 'Push another opening bracket',
              elements: [1],
            },
            {
              step: 3,
              action: 'compare',
              description: 'Closing bracket: pop and verify match',
              elements: [2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Stack empty at end → valid!',
              elements: [],
            },
          ],
        },
        suggestedFollowUps: [
          'What if the input contains non-bracket characters — how do you handle them?',
          'How would you extend this to validate HTML tags?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Min Stack
    if (q.includes('min stack')) {
      return {
        explanation:
          'Maintain two stacks: one for values and one tracking the running minimum. Every push also pushes the new minimum (min of current value and previous minimum). All operations remain O(1).',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `class MinStack:\n    def __init__(self):\n        self.stack = []\n        self.min_stack = []\n\n    def push(self, val):\n        self.stack.append(val)\n        cur_min = min(val, self.min_stack[-1] if self.min_stack else val)\n        self.min_stack.append(cur_min)\n\n    def pop(self):\n        self.stack.pop()\n        self.min_stack.pop()\n\n    def top(self):\n        return self.stack[-1]\n\n    def get_min(self):\n        return self.min_stack[-1]`,
        },
        visualSequence: {
          type: 'array',
          title: 'Min Stack with Parallel Tracking',
          steps: [
            {
              step: 1,
              action: 'insert',
              description: 'push(5): stack=[5], min_stack=[5]',
              elements: [0],
            },
            {
              step: 2,
              action: 'insert',
              description: 'push(3): stack=[5,3], min_stack=[5,3]',
              elements: [1],
            },
            {
              step: 3,
              action: 'insert',
              description: 'push(7): stack=[5,3,7], min_stack=[5,3,3]',
              elements: [2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'getMin() returns min_stack.top() = 3 in O(1)',
              elements: [1],
            },
          ],
        },
        suggestedFollowUps: [
          'Can you implement Min Stack with only one stack?',
          'How would you add a getMax() operation in O(1)?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Evaluate Reverse Polish Notation
    if (
      q.includes('reverse polish') ||
      q.includes('rpn') ||
      q.includes('polish notation') ||
      q.includes('evaluate reverse')
    ) {
      return {
        explanation:
          'Process tokens left to right: push numbers; on an operator, pop two operands, apply the operation, push the result. The final stack value is the answer. O(n) time and space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def eval_rpn(tokens):\n    stack = []\n    ops = {'+', '-', '*', '/'}\n    for tok in tokens:\n        if tok in ops:\n            b, a = stack.pop(), stack.pop()\n            if tok == '+': stack.append(a + b)\n            elif tok == '-': stack.append(a - b)\n            elif tok == '*': stack.append(a * b)\n            else: stack.append(int(a / b))  # truncate toward zero\n        else:\n            stack.append(int(tok))\n    return stack[0]`,
        },
        visualSequence: {
          type: 'array',
          title: 'Evaluate Reverse Polish Notation',
          steps: [
            {
              step: 1,
              action: 'insert',
              description: 'Push number tokens onto stack',
              elements: [0, 1],
            },
            {
              step: 2,
              action: 'delete',
              description: 'Operator: pop two operands a, b',
              elements: [0, 1],
            },
            {
              step: 3,
              action: 'insert',
              description: 'Apply op and push result back',
              elements: [2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Final stack[0] is the evaluated result',
              elements: [0],
            },
          ],
        },
        suggestedFollowUps: [
          'How does RPN eliminate the need for parentheses?',
          'How would you convert infix to RPN using the shunting-yard algorithm?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Largest Rectangle in Histogram
    if (q.includes('largest rectangle') || q.includes('histogram')) {
      return {
        explanation:
          'Use a monotonic increasing stack of indices. When a shorter bar is encountered, pop taller bars and compute their maximum rectangle width using the current index and the new stack top. O(n) time, O(n) space.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def largest_rectangle_area(heights):\n    stack = []  # (index, height)\n    max_area = 0\n    for i, h in enumerate(heights):\n        start = i\n        while stack and stack[-1][1] > h:\n            idx, ht = stack.pop()\n            max_area = max(max_area, ht * (i - idx))\n            start = idx\n        stack.append((start, h))\n    for idx, ht in stack:\n        max_area = max(max_area, ht * (len(heights) - idx))\n    return max_area`,
        },
        visualSequence: {
          type: 'array',
          title: 'Largest Rectangle in Histogram',
          steps: [
            {
              step: 1,
              action: 'insert',
              description: 'Push bar index onto monotonic stack',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Current bar shorter: pop taller bars',
              elements: [1, 2],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Calculate area: height × (cur_idx - stack_top_idx)',
              elements: [3],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Drain remaining stack at end',
              elements: [4],
            },
          ],
        },
        suggestedFollowUps: [
          'How does this relate to Trapping Rain Water?',
          'Can you extend this to find the largest rectangle in a binary matrix?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Daily Temperatures
    if (q.includes('daily temperatures') || q.includes('daily temp') || q.includes('next warmer')) {
      return {
        explanation:
          'Maintain a monotonic decreasing stack of indices. When a warmer day is found, pop indices of cooler previous days and record their wait (current index − popped index). O(n) time and space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def daily_temperatures(temps):\n    ans = [0] * len(temps)\n    stack = []  # indices of unresolved days\n    for i, t in enumerate(temps):\n        while stack and temps[stack[-1]] < t:\n            j = stack.pop()\n            ans[j] = i - j\n        stack.append(i)\n    return ans`,
        },
        visualSequence: {
          type: 'array',
          title: 'Daily Temperatures: Monotonic Stack',
          steps: [
            {
              step: 1,
              action: 'insert',
              description: 'Push day index onto decreasing stack',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Warmer day found: pop cooler indices',
              elements: [1, 2],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'ans[popped] = current_idx − popped_idx',
              elements: [2],
            },
            { step: 4, action: 'insert', description: 'Push current day index', elements: [3] },
          ],
        },
        suggestedFollowUps: [
          'What is a monotonic stack and when should you use one?',
          'How would you find the next smaller element instead?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Implement Queue Using Stacks
    if (q.includes('queue using stacks') || q.includes('implement queue')) {
      return {
        explanation:
          'Use two stacks: an inbox and an outbox. Always push to inbox. On pop/peek, if outbox is empty, transfer all of inbox to outbox (reversing order). Amortized O(1) per operation.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `class MyQueue:\n    def __init__(self):\n        self.inbox = []\n        self.outbox = []\n\n    def push(self, x):\n        self.inbox.append(x)\n\n    def _transfer(self):\n        if not self.outbox:\n            while self.inbox:\n                self.outbox.append(self.inbox.pop())\n\n    def pop(self):\n        self._transfer()\n        return self.outbox.pop()\n\n    def peek(self):\n        self._transfer()\n        return self.outbox[-1]\n\n    def empty(self):\n        return not self.inbox and not self.outbox`,
        },
        visualSequence: {
          type: 'array',
          title: 'Queue Using Two Stacks',
          steps: [
            {
              step: 1,
              action: 'insert',
              description: 'push(1,2,3): inbox=[1,2,3], outbox=[]',
              elements: [0],
            },
            {
              step: 2,
              action: 'traverse',
              description: 'pop() triggers transfer: outbox=[3,2,1]',
              elements: [1],
            },
            {
              step: 3,
              action: 'delete',
              description: 'outbox.pop() returns 1 (FIFO order)',
              elements: [2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Subsequent pops directly from outbox',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'Why is transfer amortized O(1) and not O(n) per operation?',
          'How would you implement a stack using two queues?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // ─── BINARY SEARCH ────────────────────────────────────────────────────────

    // Binary Search
    if (q.includes('binary search')) {
      return {
        explanation:
          'Maintain left and right pointers. Compute mid, compare to the target, then eliminate the half that cannot contain the answer. Each step halves the search space — O(log n) time, O(1) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def binary_search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = left + (right - left) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1`,
        },
        visualSequence: {
          type: 'searching',
          title: 'Binary Search',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Initialize left=0, right=n−1',
              elements: [0, 7],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Calculate mid and compare with target',
              elements: [3],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'Target > mid: discard left half, left=mid+1',
              elements: [4, 7],
            },
            { step: 4, action: 'highlight', description: 'Target found at mid!', elements: [5] },
          ],
        },
        suggestedFollowUps: [
          'Why use mid = left + (right - left) // 2 instead of (left + right) // 2?',
          'How do you find the leftmost or rightmost occurrence of a duplicate?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Search in Rotated Sorted Array
    if (q.includes('rotated sorted') || q.includes('search in rotated')) {
      return {
        explanation:
          'At any mid point, one half of a rotated array must be sorted. Identify which half, check if the target lies there, and narrow accordingly. O(log n) time, O(1) space.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[left] <= nums[mid]:  # left half sorted\n            if nums[left] <= target < nums[mid]:\n                right = mid - 1\n            else:\n                left = mid + 1\n        else:  # right half sorted\n            if nums[mid] < target <= nums[right]:\n                left = mid + 1\n            else:\n                right = mid - 1\n    return -1`,
        },
        visualSequence: {
          type: 'searching',
          title: 'Search in Rotated Sorted Array',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Pick mid and determine which half is sorted',
              elements: [3],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Target in sorted half? Search there',
              elements: [0, 2],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'Otherwise search the other half',
              elements: [4, 7],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Converge until target found or -1',
              elements: [5],
            },
          ],
        },
        suggestedFollowUps: [
          'How does the algorithm handle duplicates in the array?',
          'How would you find the rotation pivot index?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Find First and Last Position
    if (q.includes('first and last position') || q.includes('first last position')) {
      return {
        explanation:
          'Run two separate binary searches: one biased leftward to find the first occurrence, and one biased rightward to find the last. Each is O(log n), so the combined complexity is O(log n).',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def search_range(nums, target):\n    def find_bound(is_left):\n        lo, hi, bound = 0, len(nums) - 1, -1\n        while lo <= hi:\n            mid = (lo + hi) // 2\n            if nums[mid] == target:\n                bound = mid\n                if is_left: hi = mid - 1\n                else: lo = mid + 1\n            elif nums[mid] < target:\n                lo = mid + 1\n            else:\n                hi = mid - 1\n        return bound\n    return [find_bound(True), find_bound(False)]`,
        },
        visualSequence: {
          type: 'searching',
          title: 'First and Last Position of Target',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Left binary search: keep going left on match',
              elements: [2],
            },
            {
              step: 2,
              action: 'highlight',
              description: 'Record leftmost matching index',
              elements: [2],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Right binary search: keep going right on match',
              elements: [4],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Return [leftBound, rightBound]',
              elements: [2, 4],
            },
          ],
        },
        suggestedFollowUps: [
          'How would you count total occurrences of target using this result?',
          'Can you solve this with one binary search pass?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Koko Eating Bananas
    if (q.includes('koko') || q.includes('eating bananas')) {
      return {
        explanation:
          'Binary search on the eating speed k (from 1 to max(piles)). For each candidate k, compute hours needed (sum of ceil(pile/k)). Find the minimum k where hours ≤ h. O(n log m) where m = max(piles).',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `import math\n\ndef min_eating_speed(piles, h):\n    left, right = 1, max(piles)\n    while left < right:\n        mid = (left + right) // 2\n        hours = sum(math.ceil(p / mid) for p in piles)\n        if hours <= h:\n            right = mid\n        else:\n            left = mid + 1\n    return left`,
        },
        visualSequence: {
          type: 'searching',
          title: 'Koko Eating Bananas: Binary Search on Answer',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Search space: speed k in [1, max(piles)]',
              elements: [0, 6],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Try mid speed, compute total hours needed',
              elements: [3],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'hours <= h: try slower (right=mid)',
              elements: [1, 3],
            },
            {
              step: 4,
              action: 'traverse',
              description: 'hours > h: eat faster (left=mid+1)',
              elements: [3, 5],
            },
          ],
        },
        suggestedFollowUps: [
          'Why is binary search valid here — what property does the answer space have?',
          'How would you solve this if piles could change dynamically?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Median of Two Sorted Arrays
    if (q.includes('median of two') || q.includes('median two sorted')) {
      return {
        explanation:
          'Binary search on a partition of the smaller array so that combined left and right halves are equal in size and every left element is less than or equal to every right element. Median is then trivially computed. O(log(min(n,m))) time.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def find_median_sorted_arrays(nums1, nums2):\n    A, B = (nums1, nums2) if len(nums1) <= len(nums2) else (nums2, nums1)\n    total, half = len(A) + len(B), (len(A) + len(B)) // 2\n    lo, hi = 0, len(A)\n    while True:\n        i = (lo + hi) // 2\n        j = half - i\n        aleft  = A[i-1] if i > 0 else float('-inf')\n        aright = A[i]   if i < len(A) else float('inf')\n        bleft  = B[j-1] if j > 0 else float('-inf')\n        bright = B[j]   if j < len(B) else float('inf')\n        if aleft <= bright and bleft <= aright:\n            if total % 2:\n                return min(aright, bright)\n            return (max(aleft, bleft) + min(aright, bright)) / 2\n        elif aleft > bright:\n            hi = i - 1\n        else:\n            lo = i + 1`,
        },
        visualSequence: {
          type: 'searching',
          title: 'Median of Two Sorted Arrays',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Binary search partition i in smaller array A',
              elements: [0, 2],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Check: A[i-1] <= B[j] and B[j-1] <= A[i]',
              elements: [1, 3],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'Adjust lo/hi if partition is wrong',
              elements: [1],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Correct partition → compute median',
              elements: [2, 3],
            },
          ],
        },
        suggestedFollowUps: [
          'Why must we binary search on the smaller array?',
          'How does this differ from merging the arrays first?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // ─── TREE TRAVERSAL ───────────────────────────────────────────────────────

    // Tree Traversal — inorder, preorder, postorder, level order
    if (
      q.includes('inorder') ||
      q.includes('preorder') ||
      q.includes('postorder') ||
      q.includes('level order') ||
      (q.includes('traversal') &&
        !q.includes('dijkstra') &&
        !q.includes('bfs') &&
        !q.includes('dfs'))
    ) {
      return {
        explanation:
          'Four classic traversals: Inorder (L→Root→R) gives sorted output for a BST. Preorder (Root→L→R) is great for serialization. Postorder (L→R→Root) is used for deletion. Level Order uses BFS and visits level by level. All are O(n).',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `from collections import deque\n\n# Inorder: Left -> Root -> Right\ndef inorder(root):\n    return inorder(root.left) + [root.val] + inorder(root.right) if root else []\n\n# Preorder: Root -> Left -> Right\ndef preorder(root):\n    return [root.val] + preorder(root.left) + preorder(root.right) if root else []\n\n# Postorder: Left -> Right -> Root\ndef postorder(root):\n    return postorder(root.left) + postorder(root.right) + [root.val] if root else []\n\n# Level Order (BFS)\ndef level_order(root):\n    if not root: return []\n    q, res = deque([root]), []\n    while q:\n        level = []\n        for _ in range(len(q)):\n            node = q.popleft()\n            level.append(node.val)\n            if node.left: q.append(node.left)\n            if node.right: q.append(node.right)\n        res.append(level)\n    return res`,
        },
        visualSequence: {
          type: 'tree',
          title: 'Binary Tree Traversal Orders',
          steps: [
            {
              step: 1,
              action: 'traverse',
              description: 'Inorder: visit Left, then Root, then Right',
              elements: [0, 1, 2],
            },
            {
              step: 2,
              action: 'traverse',
              description: 'Preorder: visit Root first, then children',
              elements: [1, 0, 2],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'Postorder: visit children first, then Root',
              elements: [0, 2, 1],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Level Order: BFS layer by layer',
              elements: [1, 0, 2, 3],
            },
          ],
        },
        suggestedFollowUps: [
          'How do you implement inorder traversal iteratively using a stack?',
          'When would you choose postorder over inorder traversal?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Maximum Depth of Binary Tree
    if (q.includes('maximum depth') || q.includes('max depth') || q.includes('depth of binary')) {
      return {
        explanation:
          'Recursively compute the depth of the left and right subtrees and return 1 + max(left, right). A null node contributes 0. O(n) time, O(h) space where h is the tree height.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def max_depth(root):\n    if not root:\n        return 0\n    return 1 + max(max_depth(root.left), max_depth(root.right))`,
        },
        visualSequence: {
          type: 'tree',
          title: 'Maximum Depth of Binary Tree',
          steps: [
            {
              step: 1,
              action: 'traverse',
              description: 'Recurse into left subtree',
              elements: [0],
            },
            {
              step: 2,
              action: 'traverse',
              description: 'Recurse into right subtree',
              elements: [1],
            },
            {
              step: 3,
              action: 'compare',
              description: 'Return 1 + max(leftDepth, rightDepth)',
              elements: [0, 1],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Root call gives total depth',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'How do you find the minimum depth of a binary tree?',
          'How would you compute depth iteratively using BFS?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Balanced Binary Tree
    if (q.includes('balanced binary') || q.includes('height balanced')) {
      return {
        explanation:
          "Check balance and height in one DFS: return -1 if any subtree is unbalanced, otherwise return the node's height. This avoids recomputing heights and runs in O(n) time.",
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `def is_balanced(root):\n    def check(node):\n        if not node:\n            return 0\n        left = check(node.left)\n        if left == -1: return -1\n        right = check(node.right)\n        if right == -1: return -1\n        if abs(left - right) > 1: return -1\n        return 1 + max(left, right)\n    return check(root) != -1`,
        },
        visualSequence: {
          type: 'tree',
          title: 'Balanced Binary Tree Check',
          steps: [
            {
              step: 1,
              action: 'traverse',
              description: 'Post-order: compute left subtree height',
              elements: [0],
            },
            {
              step: 2,
              action: 'traverse',
              description: 'Compute right subtree height',
              elements: [1],
            },
            {
              step: 3,
              action: 'compare',
              description: '|left - right| > 1 -> return -1 (unbalanced)',
              elements: [0, 1],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Propagate -1 up; otherwise return height',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'Why does returning -1 short-circuit the recursion?',
          'What is the difference between a balanced BST and an AVL tree?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Lowest Common Ancestor
    if (q.includes('lowest common ancestor') || q.includes('lca')) {
      return {
        explanation:
          'Recurse left and right for both nodes. If the current node equals p or q, return it. If both left and right calls return non-null, the current node is the LCA. O(n) time, O(h) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def lowest_common_ancestor(root, p, q):\n    if not root or root == p or root == q:\n        return root\n    left = lowest_common_ancestor(root.left, p, q)\n    right = lowest_common_ancestor(root.right, p, q)\n    if left and right:\n        return root  # split point -> this is the LCA\n    return left or right`,
        },
        visualSequence: {
          type: 'tree',
          title: 'Lowest Common Ancestor',
          steps: [
            {
              step: 1,
              action: 'traverse',
              description: 'Recurse left and right subtrees for p and q',
              elements: [0, 1],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Node equals p or q -> return it up',
              elements: [2],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Both sides return non-null -> LCA found!',
              elements: [3],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Only one side non-null -> propagate upward',
              elements: [1],
            },
          ],
        },
        suggestedFollowUps: [
          'How does the LCA algorithm change for a BST?',
          'Can you find the LCA without recursion using parent pointers?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Binary Tree Path Sum
    if (q.includes('path sum') || q.includes('root to leaf')) {
      return {
        explanation:
          'Subtract the current node value from the target at each step. At a leaf, check if the remainder is zero. DFS explores every root-to-leaf path in O(n) time and O(h) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def has_path_sum(root, target):\n    if not root:\n        return False\n    target -= root.val\n    if not root.left and not root.right:\n        return target == 0\n    return has_path_sum(root.left, target) or has_path_sum(root.right, target)`,
        },
        visualSequence: {
          type: 'tree',
          title: 'Binary Tree Path Sum',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Visit root: target -= root.val',
              elements: [0],
            },
            {
              step: 2,
              action: 'traverse',
              description: 'Recurse into left child with reduced target',
              elements: [1],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'Recurse into right child with reduced target',
              elements: [2],
            },
            {
              step: 4,
              action: 'compare',
              description: 'Leaf reached: target == 0 -> path found!',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'How do you return all paths with the target sum, not just check existence?',
          'How would you find the maximum path sum in a binary tree?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Serialize and Deserialize Binary Tree
    if (q.includes('serialize') || q.includes('deserialize')) {
      return {
        explanation:
          'BFS serialization: encode each node value and use "null" markers for absent children. Deserialization rebuilds the tree by pairing each node from the queue with the next two tokens. O(n) for both operations.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `from collections import deque\n\nclass Codec:\n    def serialize(self, root):\n        if not root: return ''\n        q, res = deque([root]), []\n        while q:\n            node = q.popleft()\n            if node:\n                res.append(str(node.val))\n                q.append(node.left)\n                q.append(node.right)\n            else:\n                res.append('null')\n        return ','.join(res)\n\n    def deserialize(self, data):\n        if not data: return None\n        vals = deque(data.split(','))\n        root = TreeNode(int(vals.popleft()))\n        q = deque([root])\n        while q:\n            node = q.popleft()\n            for attr in ('left', 'right'):\n                v = vals.popleft()\n                if v != 'null':\n                    child = TreeNode(int(v))\n                    setattr(node, attr, child)\n                    q.append(child)\n        return root`,
        },
        visualSequence: {
          type: 'tree',
          title: 'Serialize / Deserialize Binary Tree',
          steps: [
            {
              step: 1,
              action: 'traverse',
              description: 'BFS: encode node values, "null" for empties',
              elements: [0, 1, 2],
            },
            {
              step: 2,
              action: 'highlight',
              description: 'Serialized string: "1,2,3,null,null,4,5"',
              elements: [0],
            },
            {
              step: 3,
              action: 'insert',
              description: 'Deserialize: rebuild tree from token queue',
              elements: [1],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Each node gets next two children from queue',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'How does DFS-based serialization differ from BFS?',
          'What are the trade-offs between compact and human-readable serialization?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Kth Smallest in BST
    if (q.includes('kth smallest') || q.includes('k-th smallest')) {
      return {
        explanation:
          'Inorder traversal of a BST visits nodes in ascending order. Decrement a counter at each visited node; when it hits zero, the current node is the k-th smallest. O(n) time, O(h) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def kth_smallest(root, k):\n    count = [0]\n    result = [None]\n    def inorder(node):\n        if not node or result[0] is not None:\n            return\n        inorder(node.left)\n        count[0] += 1\n        if count[0] == k:\n            result[0] = node.val\n            return\n        inorder(node.right)\n    inorder(root)\n    return result[0]`,
        },
        visualSequence: {
          type: 'tree',
          title: 'Kth Smallest in BST',
          steps: [
            {
              step: 1,
              action: 'traverse',
              description: 'Inorder DFS: go left first',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Visit node: increment counter',
              elements: [1],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'counter == k -> this is the k-th smallest!',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'How would you optimize this for frequent queries on a changing BST?',
          'How do you find the k-th largest element in a BST?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Validate BST
    if (
      q.includes('validate bst') ||
      q.includes('valid bst') ||
      q.includes('validate binary search')
    ) {
      return {
        explanation:
          'Pass min and max bounds down recursively. For each node, verify min < node.val < max, then recurse with updated bounds (max = node.val for left child, min = node.val for right child). O(n) time.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def is_valid_bst(root):\n    def validate(node, lo, hi):\n        if not node:\n            return True\n        if not (lo < node.val < hi):\n            return False\n        return (validate(node.left, lo, node.val) and\n                validate(node.right, node.val, hi))\n    return validate(root, float('-inf'), float('inf'))`,
        },
        visualSequence: {
          type: 'tree',
          title: 'Validate Binary Search Tree',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Start with bounds (-inf, +inf)',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Left child inherits max = parent.val',
              elements: [1],
            },
            {
              step: 3,
              action: 'compare',
              description: 'Right child inherits min = parent.val',
              elements: [2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Any violation -> not a valid BST',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          'Why is checking only left < root < right for each node insufficient?',
          'Can you validate a BST using inorder traversal instead?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // ─── HASH MAP ─────────────────────────────────────────────────────────────

    // Valid Sudoku
    if (q.includes('valid sudoku') || q.includes('sudoku')) {
      return {
        explanation:
          'Use three sets of sets — one for rows, one for columns, and one for 3x3 boxes (indexed by (r//3, c//3)). A cell value is invalid if it appears twice in any of these three sets. O(81) = O(1) time and space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def is_valid_sudoku(board):\n    rows = [set() for _ in range(9)]\n    cols = [set() for _ in range(9)]\n    boxes = [set() for _ in range(9)]\n    for r in range(9):\n        for c in range(9):\n            val = board[r][c]\n            if val == '.': continue\n            box_idx = (r // 3) * 3 + (c // 3)\n            if val in rows[r] or val in cols[c] or val in boxes[box_idx]:\n                return False\n            rows[r].add(val)\n            cols[c].add(val)\n            boxes[box_idx].add(val)\n    return True`,
        },
        visualSequence: {
          type: 'array',
          title: 'Valid Sudoku Validation',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Iterate each cell of the 9x9 board',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Check row, column, and 3x3 box sets',
              elements: [1, 2, 3],
            },
            {
              step: 3,
              action: 'insert',
              description: 'Add value to all three sets',
              elements: [4],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Duplicate found -> invalid board',
              elements: [5],
            },
          ],
        },
        suggestedFollowUps: [
          'How would you solve an empty Sudoku board (backtracking)?',
          'How do you map a cell to its 3x3 box index?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Longest Substring Without Repeating Characters
    if (q.includes('longest substring without repeating') || q.includes('longest substring')) {
      return {
        explanation:
          'Sliding window with a hash set: expand the right pointer to include new characters; when a duplicate is found, shrink from the left until it is removed. Track the maximum window size. O(n) time, O(min(n,s)) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def length_of_longest_substring(s):\n    char_set = set()\n    left = 0\n    best = 0\n    for right in range(len(s)):\n        while s[right] in char_set:\n            char_set.remove(s[left])\n            left += 1\n        char_set.add(s[right])\n        best = max(best, right - left + 1)\n    return best`,
        },
        visualSequence: {
          type: 'array',
          title: 'Longest Substring Without Repeating Characters',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Expand right pointer into window',
              elements: [0, 1, 2],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Duplicate found at right pointer',
              elements: [3],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'Shrink from left until duplicate removed',
              elements: [0, 1],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Update best = right - left + 1',
              elements: [2, 3],
            },
          ],
        },
        suggestedFollowUps: [
          'How would using a hash map (character to index) speed up the shrink step?',
          'What changes if you want at most k distinct characters?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Minimum Window Substring
    if (q.includes('minimum window substring') || q.includes('min window')) {
      return {
        explanation:
          'Use a sliding window with two frequency maps: required characters and current window. A "need" counter tracks unsatisfied characters. Expand right until satisfied, then shrink left to minimize — recording the best window. O(n) time.',
        mood: 'thinking',
        code: {
          language: 'python',
          snippet: `from collections import Counter\n\ndef min_window(s, t):\n    if not t: return ''\n    need = Counter(t)\n    window = {}\n    have, required = 0, len(need)\n    res, res_len = [-1, -1], float('inf')\n    left = 0\n    for right, c in enumerate(s):\n        window[c] = window.get(c, 0) + 1\n        if c in need and window[c] == need[c]:\n            have += 1\n        while have == required:\n            if (right - left + 1) < res_len:\n                res = [left, right]\n                res_len = right - left + 1\n            window[s[left]] -= 1\n            if s[left] in need and window[s[left]] < need[s[left]]:\n                have -= 1\n            left += 1\n    l, r = res\n    return s[l:r+1] if res_len != float('inf') else ''`,
        },
        visualSequence: {
          type: 'array',
          title: 'Minimum Window Substring',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Expand right, add char to window',
              elements: [0],
            },
            {
              step: 2,
              action: 'compare',
              description: 'have == required: all chars satisfied',
              elements: [1, 3],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'Shrink left, record minimum window',
              elements: [0, 3],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Repeat until right reaches end of s',
              elements: [5],
            },
          ],
        },
        suggestedFollowUps: [
          'How does the "have" counter avoid re-scanning the entire window?',
          'How would you find all windows matching a permutation of t?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Happy Number
    if (q.includes('happy number')) {
      return {
        explanation:
          'Repeatedly replace a number with the sum of squares of its digits. Happy numbers eventually reach 1; all others cycle back through a fixed loop including 4. Use a hash set to detect the cycle in O(log n) per step.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def is_happy(n):\n    def digit_square_sum(x):\n        total = 0\n        while x:\n            x, d = divmod(x, 10)\n            total += d * d\n        return total\n\n    seen = set()\n    while n != 1:\n        n = digit_square_sum(n)\n        if n in seen:\n            return False\n        seen.add(n)\n    return True`,
        },
        visualSequence: {
          type: 'graph',
          title: 'Happy Number Detection',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Compute sum of digit squares: 19 -> 1^2+9^2=82',
              elements: [0],
            },
            {
              step: 2,
              action: 'traverse',
              description: 'Continue transforming the number',
              elements: [1],
            },
            {
              step: 3,
              action: 'compare',
              description: 'Number in seen set -> unhappy cycle detected',
              elements: [2],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Reaches 1 -> happy number!',
              elements: [3],
            },
          ],
        },
        suggestedFollowUps: [
          "Can you use Floyd's cycle detection instead of a hash set?",
          'Which numbers are known to be unhappy and why?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // ─── SORTING ──────────────────────────────────────────────────────────────

    // Heap Sort
    if (
      q.includes('heap sort') ||
      q.includes('heapsort') ||
      (q.includes('heap') && !q.includes('min stack') && !q.includes('top k') && !q.includes('kth'))
    ) {
      return {
        explanation:
          'Build a max-heap in O(n), then repeatedly extract the maximum (swap root with last element, heapify down) — placing each extracted maximum in sorted position. O(n log n) in-place.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def heap_sort(arr):\n    n = len(arr)\n    def heapify(n, i):\n        largest = i\n        l, r = 2*i+1, 2*i+2\n        if l < n and arr[l] > arr[largest]: largest = l\n        if r < n and arr[r] > arr[largest]: largest = r\n        if largest != i:\n            arr[i], arr[largest] = arr[largest], arr[i]\n            heapify(n, largest)\n    # Build max-heap\n    for i in range(n // 2 - 1, -1, -1):\n        heapify(n, i)\n    # Extract elements\n    for i in range(n - 1, 0, -1):\n        arr[0], arr[i] = arr[i], arr[0]\n        heapify(i, 0)\n    return arr`,
        },
        visualSequence: {
          type: 'sorting',
          title: 'Heap Sort',
          steps: [
            {
              step: 1,
              action: 'insert',
              description: 'Build max-heap bottom-up (heapify non-leaf nodes)',
              elements: [0, 1, 2],
            },
            {
              step: 2,
              action: 'swap',
              description: 'Swap root (max) with last element',
              elements: [0, 5],
            },
            {
              step: 3,
              action: 'compare',
              description: 'Heapify down from root over reduced heap',
              elements: [0, 1],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Repeat: each swap places next max in sorted position',
              elements: [4, 5],
            },
          ],
        },
        suggestedFollowUps: [
          'Why is Heap Sort not cache-friendly despite being O(n log n)?',
          'How does building a heap in O(n) work (bottom-up heapify)?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Bubble Sort
    if (q.includes('bubble sort') || q.includes('bubblesort')) {
      return {
        explanation:
          'Bubble Sort repeatedly compares adjacent elements and swaps them if out of order, bubbling the largest unsorted element to the end each pass. O(n^2) worst/average, O(n) best (already sorted with an early-exit flag).',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        swapped = False\n        for j in range(n - i - 1):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n                swapped = True\n        if not swapped:\n            break  # already sorted\n    return arr`,
        },
        visualSequence: {
          type: 'sorting',
          title: 'Bubble Sort',
          steps: [
            {
              step: 1,
              action: 'compare',
              description: 'Compare adjacent elements arr[j] and arr[j+1]',
              elements: [0, 1],
            },
            {
              step: 2,
              action: 'swap',
              description: 'arr[j] > arr[j+1]: swap them',
              elements: [0, 1],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'Largest element bubbled to its final position',
              elements: [5],
            },
            {
              step: 4,
              action: 'compare',
              description: 'No swaps in pass: array is sorted early',
              elements: [0, 1, 2],
            },
          ],
        },
        suggestedFollowUps: [
          'How does Cocktail Shaker Sort improve on Bubble Sort?',
          'When is Bubble Sort actually useful in practice?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Insertion Sort
    if (q.includes('insertion sort') || q.includes('insertionsort')) {
      return {
        explanation:
          'Iterate from index 1; for each element, shift larger elements in the sorted left portion rightward to make room, then insert the element in its correct position. O(n^2) worst, O(n) best (already sorted), O(1) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def insertion_sort(arr):\n    for i in range(1, len(arr)):\n        key = arr[i]\n        j = i - 1\n        while j >= 0 and arr[j] > key:\n            arr[j + 1] = arr[j]\n            j -= 1\n        arr[j + 1] = key\n    return arr`,
        },
        visualSequence: {
          type: 'sorting',
          title: 'Insertion Sort',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Pick element at index i as key',
              elements: [2],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Shift larger sorted elements one position right',
              elements: [0, 1],
            },
            {
              step: 3,
              action: 'insert',
              description: 'Insert key at its correct sorted position',
              elements: [1],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Left portion grows as outer loop advances',
              elements: [0, 1, 2],
            },
          ],
        },
        suggestedFollowUps: [
          'Why is Insertion Sort preferred for nearly sorted small arrays?',
          'How does Binary Insertion Sort reduce comparisons?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Selection Sort
    if (q.includes('selection sort') || q.includes('selectionsort')) {
      return {
        explanation:
          'On each pass, scan the unsorted portion for the minimum element and swap it to the front. After k passes, the first k elements are sorted. Always O(n^2) comparisons regardless of input — only O(n) swaps.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def selection_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        min_idx = i\n        for j in range(i + 1, n):\n            if arr[j] < arr[min_idx]:\n                min_idx = j\n        arr[i], arr[min_idx] = arr[min_idx], arr[i]\n    return arr`,
        },
        visualSequence: {
          type: 'sorting',
          title: 'Selection Sort',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Scan unsorted portion to find minimum',
              elements: [1, 2, 3, 4],
            },
            {
              step: 2,
              action: 'compare',
              description: 'Track index of current minimum found',
              elements: [3],
            },
            {
              step: 3,
              action: 'swap',
              description: 'Swap minimum with first unsorted element',
              elements: [0, 3],
            },
            {
              step: 4,
              action: 'highlight',
              description: 'Sorted boundary advances by one',
              elements: [0],
            },
          ],
        },
        suggestedFollowUps: [
          'Is Selection Sort stable, and why does that matter?',
          'How does it compare to Insertion Sort in number of writes?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Kth Largest Element
    if (q.includes('kth largest') || q.includes('k-th largest')) {
      return {
        explanation:
          'Maintain a min-heap of size k. For each element, push it and pop the minimum if size exceeds k. The heap root is the k-th largest. O(n log k) time. Alternatively, QuickSelect gives O(n) average time.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `import heapq\n\ndef find_kth_largest(nums, k):\n    # Min-heap of size k approach\n    heap = []\n    for num in nums:\n        heapq.heappush(heap, num)\n        if len(heap) > k:\n            heapq.heappop(heap)\n    return heap[0]  # root is k-th largest`,
        },
        visualSequence: {
          type: 'array',
          title: 'Kth Largest Element',
          steps: [
            { step: 1, action: 'insert', description: 'Push element onto min-heap', elements: [0] },
            {
              step: 2,
              action: 'delete',
              description: 'Heap size > k: pop the minimum',
              elements: [1],
            },
            {
              step: 3,
              action: 'highlight',
              description: 'After all inserts, heap[0] = k-th largest',
              elements: [2],
            },
          ],
        },
        suggestedFollowUps: [
          'How does QuickSelect find the k-th largest in O(n) average time?',
          'What is the difference between k-th largest and k-th smallest?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Sort Colors (Dutch National Flag)
    if (
      q.includes('sort colors') ||
      q.includes('dutch national flag') ||
      q.includes('0 1 2') ||
      q.includes('three way')
    ) {
      return {
        explanation:
          'Dutch National Flag: use three pointers — low, mid, and high. 0s go to [0, low), 1s stay in [low, mid), 2s go to (high, end]. Swap and advance pointers in one pass. O(n) time, O(1) space.',
        mood: 'explaining',
        code: {
          language: 'python',
          snippet: `def sort_colors(nums):\n    low = mid = 0\n    high = len(nums) - 1\n    while mid <= high:\n        if nums[mid] == 0:\n            nums[low], nums[mid] = nums[mid], nums[low]\n            low += 1\n            mid += 1\n        elif nums[mid] == 1:\n            mid += 1\n        else:  # nums[mid] == 2\n            nums[mid], nums[high] = nums[high], nums[mid]\n            high -= 1`,
        },
        visualSequence: {
          type: 'sorting',
          title: 'Sort Colors: Dutch National Flag',
          steps: [
            {
              step: 1,
              action: 'highlight',
              description: 'Initialize low=0, mid=0, high=n-1',
              elements: [0, 5],
            },
            {
              step: 2,
              action: 'swap',
              description: 'nums[mid]==0: swap with low, advance low+mid',
              elements: [0, 2],
            },
            {
              step: 3,
              action: 'traverse',
              description: 'nums[mid]==1: advance mid only',
              elements: [3],
            },
            {
              step: 4,
              action: 'swap',
              description: 'nums[mid]==2: swap with high, decrement high',
              elements: [2, 5],
            },
          ],
        },
        suggestedFollowUps: [
          'Why do we not advance mid after swapping with high?',
          'How would you extend this to sort k distinct values?',
        ],
        modelUsed: model,
        fallbackMode: true,
        ...(warning ? { warning } : {}),
      };
    }

    // Generic DS&A question response
    return {
      explanation: `Let us break down this concept! In computer science, choosing the optimal data structure and algorithm balances execution time and memory footprint efficiently.`,
      mood: 'explaining',
      code: {
        language: 'python',
        snippet: `# Algorithm Demonstration\ndef solve_problem(data):\n    # Process data systematically\n    return [item for item in data if item is not None]`,
      },
      visualSequence: {
        type: 'array',
        title: 'Step-by-Step Visualization',
        steps: [
          {
            step: 1,
            action: 'highlight',
            description: 'Input structure initialized',
            elements: [0],
          },
          {
            step: 2,
            action: 'compare',
            description: 'Iterate and evaluate items',
            elements: [0, 1],
          },
          { step: 3, action: 'swap', description: 'Synthesize optimal solution', elements: [1] },
        ],
      },
      suggestedFollowUps: [
        'What is the worst-case time complexity?',
        'Can this be solved using dynamic programming or recursion?',
      ],
      modelUsed: model,
      fallbackMode: true,
      ...(warning ? { warning } : {}),
    };
  }
}

const openRouterService = new OpenRouterService();

module.exports = {
  OpenRouterService,
  openRouterService,
};
