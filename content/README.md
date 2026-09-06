# Content & Curriculum Workspace (Role 3: Content & Curriculum Developer)

> **Lead / Owner**: Aarav Bhatnagar  
> **Reviewer / Project Lead**: Pranjay Srivastava ([@PranjaySrivastava](https://github.com/PranjaySrivastava))

Welcome, **Aarav**! This directory is your primary workspace to design, curate, and maintain the educational foundation and curriculum for the AI Teaching Assistant.

---

## 🎯 Your Core Responsibilities & Deliverables

Based on the Hackathon specification (Page 7 of Architecture Guide):

### 1. Q&A Database (`qa-database/`)

- **Core Curriculum Dataset (`qa-dataset.json`)**: Curate 50–100 pre-written, high-quality Q&A pairs covering fundamental DS&A topics:
  - Arrays, Strings & Two Pointers
  - Sorting & Searching (QuickSort, MergeSort, Binary Search)
  - Linked Lists & Stacks/Queues
  - Trees & Binary Search Trees
  - Graphs (BFS, DFS, Dijkstra)
  - Dynamic Programming basics
- **Difficulty Tiers**: Include Easy, Medium, and Hard variations with expected time/space complexity analysis.

### 2. Visual Animation Scripts (`visual-scripts/`)

- Define exact step-by-step visual animation directives for each algorithm so frontend and backend developers know what visual transitions should appear on the canvas (e.g. which elements to compare, swap, highlight, or partition).

### 3. Reference Code Snippets (`code-snippets/`)

- Provide clean, production-quality reference implementations in:
  - **Python**
  - **JavaScript / TypeScript**
  - **C++ / Java**

### 4. Out-of-Scope & Edge Cases

- Document conversational responses for non-DS&A questions (e.g., questions about history, science, or general chit-chat) to redirect students back to the curriculum.

---

## 🚨 PR Check Requirements Before Merging

Before your PR can be merged to `main`:

1. All modified JSON files must be valid syntax.
2. Formatted with Prettier (`npm run format:check`).
3. Approval required from `@PranjaySrivastava`.
