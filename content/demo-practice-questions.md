# Demo Day Practice Questions for Professor Ada (AI Teaching Assistant)

Curated list of realistic student questions categorized for live demo judging and testing.

---

## 🎯 5 Easy Warmup Questions

1. **"What is the time complexity of Binary Search?"**
   - _Expected_: Explains $O(\log n)$ logarithmic time, dividing the search space in half each step on sorted data.

2. **"Can you explain dynamic programming using the Fibonacci sequence?"**
   - _Expected_: Explains memoization and tabulation, reducing overlapping subproblems from exponential $O(2^n)$ to linear $O(n)$ time.

3. **"How does a stack work and how is it used in Valid Parentheses?"**
   - _Expected_: Explains LIFO (Last In First Out), pushing opening brackets and popping/matching on closing brackets.

4. **"What is the difference between an array and a linked list?"**
   - _Expected_: Compares contiguous memory vs node pointers, discussing $O(1)$ random indexing vs $O(1)$ insertion/deletion.

5. **"What does Big-O notation represent?"**
   - _Expected_: Explains upper bound asymptotic growth rate of time/space complexity as input size $n \to \infty$.

---

## 🚀 10 Medium Algorithm Deep-Dives

6. **"Why does QuickSort degrade to O(n²) on already sorted arrays?"**
   - _Expected_: Explains unbalanced partition when selecting the first/last element as pivot, resulting in $n$ recursive levels.

7. **"How do you delete node 40 from a Binary Search Tree?"**
   - _Expected_: Golden Demo Scenario 1 — Identifies node 40 as a leaf node in the $[50, 30, 70, 20, 40, 60, 80]$ tree and severs pointer `30.right = null`.

8. **"How does Dijkstra's algorithm find the shortest path from node A to node F in a weighted graph?"**
   - _Expected_: Golden Demo Scenario 2 — Explains priority queue min-heap edge relaxation from $A \to E \to F$ with total cost 4.

9. **"How is BFS different from DFS when traversing a graph?"**
   - _Expected_: Contrasts level-order FIFO queue (shortest unweighted paths) with deep LIFO call stack traversal.

10. **"How does the sliding window technique optimize subarray problems to O(n)?"**
    - _Expected_: Explains maintaining running state by adding incoming right elements and removing outgoing left elements.

11. **"Can you walk me through MergeSort step by step?"**
    - _Expected_: Explains divide-and-conquer recursive splitting to halves followed by two-pointer merge conquer in stable $O(n \log n)$.

12. **"How does a Trie prefix tree store strings and perform O(L) search?"**
    - _Expected_: Explains root-to-leaf character node branching and prefix lookups independent of total dictionary size.

13. **"How does Kadane's algorithm find the maximum subarray sum in one pass?"**
    - _Expected_: Explains dynamic state $currSum = \max(x, currSum + x)$ and tracking global max in $O(n)$ time.

14. **"How does two pointers solve Container With Most Water in O(n)?"**
    - _Expected_: Explains starting at maximum width and moving the shorter bar inward to maximize volume potential.

15. **"How does an LRU Cache achieve O(1) get and put?"**
    - _Expected_: Explains pairing a hash map for $O(1)$ lookups with a doubly linked list for $O(1)$ recency updates and eviction.

---

## 🛡️ 5 Tricky Edge-Cases & Out-of-Scope Tests

16. **"What happens if Dijkstra encounters negative edge weights?"**
    - _Expected_: Explains that Dijkstra's greedy assumption fails with negative weights/cycles, and recommends Bellman-Ford or SPFA instead.

17. **"What is the capital of France?"**
    - _Expected_: Courteously redirects student: _"I'm your Data Structures & Algorithms teaching assistant! Let's stay focused on topics like trees, sorting, graphs, or DP. What DS&A question can I help you with?"_

18. **"Can you write an essay on French history?"**
    - _Expected_: Politely handles out-of-scope inquiry and redirects to computer science curriculum.

19. **"What is the derivative of sin(x)?"**
    - _Expected_: Polite mathematics out-of-scope redirection back to programming algorithms and data structures.

20. **"So QuickSort uses divide and conquer with a pivot, and average case is O(n log n) — did I get that right?"**
    - _Expected_: Positive reinforcement celebration mood confirming student understanding and presenting quick follow-up challenge.
