# Content & Curriculum Workspace (Role 3)

Welcome **Content & Curriculum Developer**! This directory is your primary workspace to design, curate, and maintain the educational foundation of the AI Teaching Assistant.

## Your Deliverables (Week 1–2)

1. **Q&A Database (`qa-database/`)**:
   - Curate 50–100 core DS&A questions and validated answers in `qa-dataset.json`.
   - Include multiple difficulty levels (Easy, Medium, Hard).
2. **Visual Scripts (`visual-scripts/`)**:
   - Define exact step-by-step visual animation flows for:
     - Sorting: QuickSort, MergeSort, BubbleSort.
     - Trees: BST insertion, AVL rotations.
     - Graphs: BFS, DFS, Dijkstra.
     - Lists: Linked list reversal, Array indexing.
3. **Reference Code Snippets (`code-snippets/`)**:
   - Provide tested, clean implementations in Python, JavaScript, and C++.
4. **Out-of-Scope & Edge Cases (`edge-cases.md`)**:
   - Define how the avatar politely redirects students when asked non-DS&A questions (e.g., weather, general chat).

## Automated PR Check

Whenever you submit a PR modifying files in `content/`, the automated CI validator ensures:

- All JSON files conform to schema.
- Questions have valid categories, answers, and visual scripts.
