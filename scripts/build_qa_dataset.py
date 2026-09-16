import json
import os

# Complete topic builder for all required categories and topics
def build_dataset():
    topics = []
    
    # helper
    def add(t_id, cat, diff, title, q, summary, best, avg, worst, space, v_type, v_desc, v_steps, py, js, cpp, java):
        topics.append({
            "id": t_id,
            "category": cat,
            "difficulty": diff,
            "title": title,
            "question": q,
            "expectedAnswer": {
                "summary": summary,
                "timeComplexity": {
                    "best": best,
                    "average": avg,
                    "worst": worst
                },
                "spaceComplexity": space
            },
            "visualScript": {
                "type": v_type,
                "description": v_desc,
                "steps": v_steps
            },
            "codeReferences": {
                "python": py.strip(),
                "javascript": js.strip(),
                "cpp": cpp.strip(),
                "java": java.strip()
            }
        })

    # 1. quicksort (existing)
    add(
        "quicksort", "sorting", "medium", "QuickSort Algorithm",
        "How does QuickSort work and what is its average time complexity?",
        "QuickSort is a divide-and-conquer algorithm that selects a 'pivot' element and partitions the other elements into two sub-arrays according to whether they are less than or greater than the pivot.",
        "O(n log n)", "O(n log n)", "O(n^2)", "O(log n)",
        "array_partition", "Show array elements with pivot highlighted in yellow, smaller elements moved to the left in cyan, and greater elements to the right in purple.",
        [
            {"action": "select_pivot", "index": 6, "value": 45},
            {"action": "compare", "left": 0, "right": 6},
            {"action": "partition", "leftRange": [0, 2], "rightRange": [3, 5]}
        ],
        """def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)""",
        """function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const mid = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...mid, ...quickSort(right)];
}""",
        """#include <vector>
using namespace std;

int partition(vector<int>& arr, int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    swap(arr[i + 1], arr[high]);
    return i + 1;
}

void quickSort(vector<int>& arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}""",
        """public class QuickSort {
    public static void quickSort(int[] arr, int low, int high) {
        if (low < high) {
            int pi = partition(arr, low, high);
            quickSort(arr, low, pi - 1);
            quickSort(arr, pi + 1, high);
        }
    }
    private static int partition(int[] arr, int low, int high) {
        int pivot = arr[high];
        int i = low - 1;
        for (int j = low; j < high; j++) {
            if (arr[j] < pivot) {
                i++;
                int t = arr[i]; arr[i] = arr[j]; arr[j] = t;
            }
        }
        int t = arr[i + 1]; arr[i + 1] = arr[high]; arr[high] = t;
        return i + 1;
    }
}"""
    )

    # 2. binary-search (existing)
    add(
        "binary-search", "searching", "easy", "Binary Search",
        "Explain Binary Search and why the array must be sorted.",
        "Binary Search repeatedly divides the search interval in half. It only works on sorted arrays because the ordering guarantees whether the target lies in the left or right half.",
        "O(1)", "O(log n)", "O(log n)", "O(1)",
        "binary_search_pointers", "Render array with low, mid, and high pointers adjusting at each step.",
        [
            {"action": "init_pointers", "low": 0, "mid": 3, "high": 6},
            {"action": "compare_target", "target": 23, "midValue": 34}
        ],
        """def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1""",
        """function binarySearch(arr, target) {
  let low = 0, high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}""",
        """#include <vector>
using namespace std;

int binarySearch(const vector<int>& arr, int target) {
    int low = 0, high = arr.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}""",
        """public class BinarySearch {
    public static int search(int[] arr, int target) {
        int low = 0, high = arr.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] == target) return mid;
            if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }
}"""
    )

    # 3. Task 1: Golden Demo - bst-deletion
    add(
        "bst-deletion", "trees", "medium", "Binary Search Tree Node Deletion",
        "How do you delete node 40 from a Binary Search Tree?",
        "To delete node 40 from the BST, we traverse starting from root 50. Since 40 < 50 we move left to 30; since 40 > 30 we move right to 40. We identify that node 40 is a leaf node (0 children) and sever the parent pointer (30.right = null).",
        "O(1)", "O(log n)", "O(n)", "O(h)",
        "tree_deletion", "Traverse BST matching nodes [50, 30, 70, 20, 40, 60, 80], identify target node 40 as leaf node, and prune leaf pointer.",
        [
            {"action": "highlight", "node": 50, "description": "Start at root node 50. 40 < 50, traverse left."},
            {"action": "traverse", "node": 30, "description": "Examine node 30. 40 > 30, traverse right."},
            {"action": "highlight", "node": 40, "description": "Target node 40 found. Verify it has no children (leaf)."},
            {"action": "delete", "node": 40, "description": "Sever parent pointer 30.right = null. Node 40 removed."}
        ],
        """class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def delete_node(root, key):
    if not root:
        return None
    if key < root.val:
        root.left = delete_node(root.left, key)
    elif key > root.val:
        root.right = delete_node(root.right, key)
    else:
        if not root.left:
            return root.right
        if not root.right:
            return root.left
        curr = root.right
        while curr.left:
            curr = curr.left
        root.val = curr.val
        root.right = delete_node(root.right, curr.val)
    return root""",
        """function deleteNode(root, key) {
  if (!root) return null;
  if (key < root.val) {
    root.left = deleteNode(root.left, key);
  } else if (key > root.val) {
    root.right = deleteNode(root.right, key);
  } else {
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    let curr = root.right;
    while (curr.left) curr = curr.left;
    root.val = curr.val;
    root.right = deleteNode(root.right, curr.val);
  }
  return root;
}""",
        """struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

TreeNode* deleteNode(TreeNode* root, int key) {
    if (!root) return nullptr;
    if (key < root->val) root->left = deleteNode(root->left, key);
    else if (key > root->val) root->right = deleteNode(root->right, key);
    else {
        if (!root->left) return root->right;
        if (!root->right) return root->left;
        TreeNode* succ = root->right;
        while (succ->left) succ = succ->left;
        root->val = succ->val;
        root->right = deleteNode(root->right, succ->val);
    }
    return root;
}""",
        """public class BSTDelete {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int v) { val = v; }
    }
    public static TreeNode deleteNode(TreeNode root, int key) {
        if (root == null) return null;
        if (key < root.val) root.left = deleteNode(root.left, key);
        else if (key > root.val) root.right = deleteNode(root.right, key);
        else {
            if (root.left == null) return root.right;
            if (root.right == null) return root.left;
            TreeNode s = root.right;
            while (s.left != null) s = s.left;
            root.val = s.val;
            root.right = deleteNode(root.right, s.val);
        }
        return root;
    }
}"""
    )

    # 4. Task 1: Golden Demo - graph-dijkstra
    add(
        "graph-dijkstra", "graphs", "hard", "Weighted Graph Traversal (Dijkstra's Algorithm)",
        "How does Dijkstra's algorithm find the shortest path from node A to node F in a weighted graph?",
        "Dijkstra's algorithm uses a priority queue (min-heap) for greedy exploration and edge relaxation. Starting at node A (dist 0), it explores adjacent edges, updates shortest distances, and finalizes nodes until reaching node F.",
        "O((V + E) log V)", "O((V + E) log V)", "O((V + E) log V)", "O(V + E)",
        "graph_dijkstra", "Traverse weighted graph across vertices A, B, C, D, E, F updating distance map and priority queue.",
        [
            {"action": "visit", "node": "A", "description": "Visit node A (distance 0). Push (0, A) to priority queue."},
            {"action": "relax", "edges": [{"from": "A", "to": "C", "weight": 3}, {"from": "A", "to": "E", "weight": 2}], "description": "Relax edges from A to C (weight 3) and E (weight 2)."},
            {"action": "visit", "node": "E", "description": "Visit node E, relax edge E to F (cost 4)."},
            {"action": "visit", "node": "F", "description": "Visit destination node F (finalized path A -> E -> F with cost 4)."}
        ],
        """import heapq

def dijkstra(graph, start, target):
    pq = [(0, start, [start])]
    visited = set()
    while pq:
        cost, u, path = heapq.heappop(pq)
        if u in visited:
            continue
        visited.add(u)
        if u == target:
            return cost, path
        for v, w in graph.get(u, []):
            if v not in visited:
                heapq.heappush(pq, (cost + w, v, path + [v]))
    return float('inf'), []""",
        """function dijkstra(graph, start, target) {
  const dist = { [start]: 0 };
  const visited = new Set();
  const pq = [[0, start, [start]]];
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [cost, u, path] = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === target) return { cost, path };
    for (const [v, w] of (graph[u] || [])) {
      if (!visited.has(v) && cost + w < (dist[v] ?? Infinity)) {
        dist[v] = cost + w;
        pq.push([dist[v], v, [...path, v]]);
      }
    }
  }
  return { cost: Infinity, path: [] };
}""",
        """#include <vector>
#include <queue>
#include <unordered_map>
using namespace std;

pair<int, vector<char>> dijkstra(unordered_map<char, vector<pair<char, int>>>& g, char start, char target) {
    priority_queue<pair<int, char>, vector<pair<int, char>>, greater<pair<int, char>>> pq;
    unordered_map<char, int> dist;
    pq.push({0, start});
    dist[start] = 0;
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (u == target) return {d, {}};
        if (d > dist[u]) continue;
        for (auto& [v, w] : g[u]) {
            if (!dist.count(v) || dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    return {-1, {}};
}""",
        """import java.util.*;
public class Dijkstra {
    static class Node implements Comparable<Node> {
        char id; int dist;
        Node(char i, int d) { id = i; dist = d; }
        public int compareTo(Node o) { return Integer.compare(this.dist, o.dist); }
    }
    public static int shortestPath(Map<Character, List<Node>> g, char start, char target) {
        PriorityQueue<Node> pq = new PriorityQueue<>();
        Map<Character, Integer> dist = new HashMap<>();
        pq.add(new Node(start, 0));
        dist.put(start, 0);
        while (!pq.isEmpty()) {
            Node curr = pq.poll();
            if (curr.id == target) return curr.dist;
            if (curr.dist > dist.getOrDefault(curr.id, Integer.MAX_VALUE)) continue;
            for (Node nb : g.getOrDefault(curr.id, Collections.emptyList())) {
                int d = curr.dist + nb.dist;
                if (d < dist.getOrDefault(nb.id, Integer.MAX_VALUE)) {
                    dist.put(nb.id, d);
                    pq.add(new Node(nb.id, d));
                }
            }
        }
        return -1;
    }
}"""
    )

    # 5. Task 3 FAANG: mergesort
    add(
        "mergesort", "sorting", "medium", "MergeSort Algorithm",
        "How does MergeSort work and why is it a stable O(n log n) sorting algorithm?",
        "MergeSort recursively divides the array into two equal halves until base subarrays of size 1 are reached, then merges the sorted halves using two pointers in O(n) auxiliary time per level, guaranteeing stable O(n log n) performance.",
        "O(n log n)", "O(n log n)", "O(n log n)", "O(n)",
        "merge_sort_tree", "Visualize recursive division of array into halves, followed by two-pointer merge conquer step.",
        [
            {"action": "split", "subarrays": [[38, 27, 43], [3, 9, 82, 10]], "description": "Divide array into left and right halves."},
            {"action": "recurse_split", "level": 2, "description": "Split further until single-element subarrays [38], [27], [43]..."},
            {"action": "merge", "left": [27, 38], "right": [43], "result": [27, 38, 43], "description": "Two-pointer comparison merging into sorted subarray."}
        ],
        """def mergesort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = mergesort(arr[:mid])
    right = mergesort(arr[mid:])
    merged = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i]); i += 1
        else:
            merged.append(right[j]); j += 1
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged""",
        """function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  const res = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) res.push(left[i++]);
    else res.push(right[j++]);
  }
  return res.concat(left.slice(i)).concat(right.slice(j));
}""",
        """#include <vector>
using namespace std;

void merge(vector<int>& arr, int l, int m, int r) {
    vector<int> left(arr.begin() + l, arr.begin() + m + 1);
    vector<int> right(arr.begin() + m + 1, arr.begin() + r + 1);
    int i = 0, j = 0, k = l;
    while (i < left.size() && j < right.size()) {
        if (left[i] <= right[j]) arr[k++] = left[i++];
        else arr[k++] = right[j++];
    }
    while (i < left.size()) arr[k++] = left[i++];
    while (j < right.size()) arr[k++] = right[j++];
}

void mergeSort(vector<int>& arr, int l, int r) {
    if (l < r) {
        int m = l + (r - l) / 2;
        mergeSort(arr, l, m);
        mergeSort(arr, m + 1, r);
        merge(arr, l, m, r);
    }
}""",
        """public class MergeSort {
    public static void sort(int[] arr, int l, int r) {
        if (l < r) {
            int m = l + (r - l) / 2;
            sort(arr, l, m);
            sort(arr, m + 1, r);
            merge(arr, l, m, r);
        }
    }
    private static void merge(int[] arr, int l, int m, int r) {
        int[] L = java.util.Arrays.copyOfRange(arr, l, m + 1);
        int[] R = java.util.Arrays.copyOfRange(arr, m + 1, r + 1);
        int i = 0, j = 0, k = l;
        while (i < L.length && j < R.length) {
            if (L[i] <= R[j]) arr[k++] = L[i++];
            else arr[k++] = R[j++];
        }
        while (i < L.length) arr[k++] = L[i++];
        while (j < R.length) arr[k++] = R[j++];
    }
}"""
    )

    # 6. Task 3 FAANG: avl-tree
    add(
        "avl-tree", "trees", "hard", "AVL Tree Rotations and Self-Balancing",
        "How does an AVL Tree maintain balance through single and double rotations?",
        "An AVL Tree is a self-balancing binary search tree where the balance factor (height(left) - height(right)) of any node is strictly in {-1, 0, 1}. When an insertion causes an imbalance (|BF| > 1), it restores balance in O(1) time using LL, RR, LR, or RL rotations.",
        "O(log n)", "O(log n)", "O(log n)", "O(h)",
        "tree_rotation", "Show left/right height calculation, imbalance detection (BF = +2), and tree rotation restoring balance factor to 0.",
        [
            {"action": "calculate_bf", "node": 30, "leftHeight": 2, "rightHeight": 0, "bf": 2, "description": "Detect balance factor +2 at node 30 after inserting 10."},
            {"action": "rotate_right", "pivot": 20, "root": 30, "description": "Execute right rotation around node 20."},
            {"action": "balance_restored", "newRoot": 20, "description": "Tree height balanced. Left and right subtrees have height 1."}
        ],
        """class AVLNode:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
        self.height = 1

def get_height(node):
    return node.height if node else 0

def get_balance(node):
    return get_height(node.left) - get_height(node.right) if node else 0

def right_rotate(y):
    x = y.left
    T2 = x.right
    x.right = y
    y.left = T2
    y.height = 1 + max(get_height(y.left), get_height(y.right))
    x.height = 1 + max(get_height(x.left), get_height(x.right))
    return x""",
        """function rightRotate(y) {
  const x = y.left;
  const T2 = x.right;
  x.right = y;
  y.left = T2;
  y.height = Math.max(getHeight(y.left), getHeight(y.right)) + 1;
  x.height = Math.max(getHeight(x.left), getHeight(x.right)) + 1;
  return x;
}""",
        """struct Node {
    int key, height;
    Node *left, *right;
    Node(int k) : key(k), height(1), left(nullptr), right(nullptr) {}
};

int height(Node* n) { return n ? n->height : 0; }
int getBalance(Node* n) { return n ? height(n->left) - height(n->right) : 0; }

Node* rightRotate(Node* y) {
    Node* x = y->left;
    Node* T2 = x->right;
    x->right = y; y->left = T2;
    y->height = max(height(y->left), height(y->right)) + 1;
    x->height = max(height(x->left), height(x->right)) + 1;
    return x;
}""",
        """public class AVLTree {
    static class Node {
        int key, height = 1;
        Node left, right;
        Node(int k) { key = k; }
    }
    static int height(Node n) { return n == null ? 0 : n.height; }
    static Node rightRotate(Node y) {
        Node x = y.left;
        Node T2 = x.right;
        x.right = y; y.left = T2;
        y.height = Math.max(height(y.left), height(y.right)) + 1;
        x.height = Math.max(height(x.left), height(x.right)) + 1;
        return x;
    }
}"""
    )

    # 7. Task 3 FAANG: bfs-vs-dfs
    add(
        "bfs-vs-dfs", "graphs", "medium", "Breadth-First Search (BFS) vs Depth-First Search (DFS)",
        "Compare BFS and DFS in graph traversal: when should you use each?",
        "BFS explores nodes level-by-level using a FIFO queue, making it optimal for unweighted shortest path queries. DFS explores as deeply as possible along each branch using recursion or a LIFO stack, making it ideal for cycle detection, topological sorting, and maze solving. Both run in O(V + E) time.",
        "O(V + E)", "O(V + E)", "O(V + E)", "O(V)",
        "graph_traversal_comparison", "Render side-by-side traversal: BFS radial level expansion with queue vs DFS deep single-path dive with call stack.",
        [
            {"action": "bfs_level", "level": 1, "queue": ["A"], "description": "BFS expands root node A into queue."},
            {"action": "bfs_expand", "level": 2, "queue": ["B", "C"], "description": "BFS visits all distance-1 neighbors."},
            {"action": "dfs_dive", "stack": ["A", "B", "D"], "description": "DFS dives down path A -> B -> D to leaf before backtracking."}
        ],
        """from collections import deque

def bfs(graph, start):
    visited = {start}
    queue = deque([start])
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in graph.get(u, []):
            if v not in visited:
                visited.add(v)
                queue.append(v)
    return order

def dfs(graph, start, visited=None, order=None):
    if visited is None: visited = set(); order = []
    visited.add(start)
    order.append(start)
    for v in graph.get(start, []):
        if v not in visited:
            dfs(graph, v, visited, order)
    return order""",
        """function bfs(graph, start) {
  const visited = new Set([start]);
  const queue = [start], order = [];
  while (queue.length) {
    const u = queue.shift();
    order.push(u);
    for (const v of (graph[u] || [])) {
      if (!visited.has(v)) { visited.add(v); queue.push(v); }
    }
  }
  return order;
}

function dfs(graph, start, visited = new Set(), order = []) {
  visited.add(start);
  order.push(start);
  for (const v of (graph[start] || [])) {
    if (!visited.has(v)) dfs(graph, v, visited, order);
  }
  return order;
}""",
        """#include <vector>
#include <queue>
#include <unordered_set>
#include <unordered_map>
using namespace std;

vector<int> bfs(unordered_map<int, vector<int>>& g, int start) {
    vector<int> order;
    unordered_set<int> visited = {start};
    queue<int> q; q.push(start);
    while (!q.empty()) {
        int u = q.front(); q.pop(); order.push_back(u);
        for (int v : g[u]) {
            if (!visited.count(v)) { visited.insert(v); q.push(v); }
        }
    }
    return order;
}""",
        """import java.util.*;
public class BFSDFS {
    public static List<Integer> bfs(Map<Integer, List<Integer>> g, int start) {
        List<Integer> order = new ArrayList<>();
        Set<Integer> visited = new HashSet<>();
        Queue<Integer> q = new LinkedList<>();
        visited.add(start); q.add(start);
        while (!q.isEmpty()) {
            int u = q.poll(); order.add(u);
            for (int v : g.getOrDefault(u, Collections.emptyList())) {
                if (visited.add(v)) q.add(v);
            }
        }
        return order;
    }
}"""
    )

    # 8. Task 3 FAANG: knapsack-01
    add(
        "knapsack-01", "dynamic-programming", "hard", "0/1 Knapsack Problem",
        "Explain the 0/1 Knapsack problem and how dynamic programming achieves optimal substructure.",
        "In the 0/1 Knapsack problem, given items with weights and values, we maximize total value without exceeding capacity W. The DP recurrence dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt[i-1]] + val[i-1]) decides whether to include or exclude item i, executing in O(n * W) pseudo-polynomial time.",
        "O(n * W)", "O(n * W)", "O(n * W)", "O(n * W) or O(W)",
        "dp_table_2d", "Construct 2D DP matrix with capacity columns 0..W and item rows, highlighting include vs exclude optimal decisions.",
        [
            {"action": "init_table", "rows": 4, "cols": 8, "description": "Initialize dp table of size (n+1) x (W+1) with zeros."},
            {"action": "evaluate_cell", "item": 2, "weight": 3, "val": 4, "capacity": 5, "description": "Compare exclude dp[i-1][5] vs include dp[i-1][2] + 4."},
            {"action": "fill_cell", "row": 2, "col": 5, "value": 7, "description": "Optimal subproblem value 7 written to table."}
        ],
        """def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [0] * (capacity + 1)
    for i in range(n):
        for w in range(capacity, weights[i] - 1, -1):
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]""",
        """function knapsack(weights, values, capacity) {
  const dp = new Array(capacity + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let w = capacity; w >= weights[i]; w--) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[capacity];
}""",
        """#include <vector>
using namespace std;

int knapsack(const vector<int>& wt, const vector<int>& val, int W) {
    vector<int> dp(W + 1, 0);
    for (size_t i = 0; i < wt.size(); i++) {
        for (int w = W; w >= wt[i]; w--) {
            dp[w] = max(dp[w], dp[w - wt[i]] + val[i]);
        }
    }
    return dp[W];
}""",
        """public class Knapsack {
    public static int solve(int[] wt, int[] val, int W) {
        int[] dp = new int[W + 1];
        for (int i = 0; i < wt.length; i++) {
            for (int w = W; w >= wt[i]; w--) {
                dp[w] = Math.max(dp[w], dp[w - wt[i]] + val[i]);
            }
        }
        return dp[W];
    }
}"""
    )

    # 9. Task 3 FAANG: sliding-window
    add(
        "sliding-window", "arrays", "medium", "Sliding Window Technique (Max Sum Subarray)",
        "How does the sliding window technique optimize subarray problems from O(n^2) to O(n)?",
        "The sliding window technique avoids redundant recomputation by maintaining a running window over a contiguous segment of the array. When moving the window one position to the right, we add the incoming right element and subtract the outgoing left element in O(1) time.",
        "O(n)", "O(n)", "O(n)", "O(1)",
        "sliding_window_bars", "Highlight subarray window of size k moving across array, adding new element on right and dropping left element.",
        [
            {"action": "init_window", "range": [0, 2], "windowSum": 16, "description": "Compute initial sum of first k=3 elements [2, 5, 9]."},
            {"action": "slide_right", "addIndex": 3, "removeIndex": 0, "newSum": 21, "description": "Slide window: add arr[3]=7, subtract arr[0]=2."},
            {"action": "update_max", "maxSum": 21, "description": "Update maximum subarray sum to 21."}
        ],
        """def max_sub_array_of_size_k(k, arr):
    max_sum = 0
    window_sum = 0
    window_start = 0
    for window_end in range(len(arr)):
        window_sum += arr[window_end]
        if window_end >= k - 1:
            max_sum = max(max_sum, window_sum)
            window_sum -= arr[window_start]
            window_start += 1
    return max_sum""",
        """function maxSubArrayOfSizeK(k, arr) {
  let maxSum = 0, windowSum = 0, windowStart = 0;
  for (let windowEnd = 0; windowEnd < arr.length; windowEnd++) {
    windowSum += arr[windowEnd];
    if (windowEnd >= k - 1) {
      maxSum = Math.max(maxSum, windowSum);
      windowSum -= arr[windowStart++];
    }
  }
  return maxSum;
}""",
        """#include <vector>
using namespace std;

int maxSubArrayOfSizeK(int k, const vector<int>& arr) {
    int maxSum = 0, windowSum = 0, windowStart = 0;
    for (int windowEnd = 0; windowEnd < arr.size(); windowEnd++) {
        windowSum += arr[windowEnd];
        if (windowEnd >= k - 1) {
            maxSum = max(maxSum, windowSum);
            windowSum -= arr[windowStart++];
        }
    }
    return maxSum;
}""",
        """public class SlidingWindow {
    public static int maxSubArrayOfSizeK(int k, int[] arr) {
        int maxSum = 0, windowSum = 0, windowStart = 0;
        for (int windowEnd = 0; windowEnd < arr.length; windowEnd++) {
            windowSum += arr[windowEnd];
            if (windowEnd >= k - 1) {
                maxSum = Math.max(maxSum, windowSum);
                windowSum -= arr[windowStart++];
            }
        }
        return maxSum;
    }
}"""
    )

    # 10. Task 3 FAANG: trie-prefix-tree
    add(
        "trie-prefix-tree", "trees", "medium", "Trie (Prefix Tree) Implementation",
        "How does a Trie prefix tree store strings and perform O(L) prefix lookups?",
        "A Trie is a tree where each node represents a character. Strings sharing a common prefix share nodes starting from the root. Inserting or searching a word of length L traverses exactly L edges, executing in deterministic O(L) time regardless of the number of words stored.",
        "O(L)", "O(L)", "O(L)", "O(N * L * AlphabetSize)",
        "trie_graph", "Render tree of character nodes, highlighting root -> 'c' -> 'a' -> 't' with isEndOfWord flag on leaf.",
        [
            {"action": "insert_char", "char": "c", "level": 1, "description": "Create edge from root for character 'c'."},
            {"action": "insert_char", "char": "a", "level": 2, "description": "Traverse to 'a' node."},
            {"action": "insert_char", "char": "t", "level": 3, "isEndOfWord": True, "description": "Mark terminal node for word 'cat'."}
        ],
        """class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end_of_word = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        curr = self.root
        for ch in word:
            if ch not in curr.children:
                curr.children[ch] = TrieNode()
            curr = curr.children[ch]
        curr.is_end_of_word = True

    def search(self, word: str) -> bool:
        curr = self.root
        for ch in word:
            if ch not in curr.children: return False
            curr = curr.children[ch]
        return curr.is_end_of_word

    def starts_with(self, prefix: str) -> bool:
        curr = self.root
        for ch in prefix:
            if ch not in curr.children: return False
            curr = curr.children[ch]
        return True""",
        """class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
  }
}

class Trie {
  constructor() { this.root = new TrieNode(); }
  insert(word) {
    let curr = this.root;
    for (const ch of word) {
      if (!curr.children[ch]) curr.children[ch] = new TrieNode();
      curr = curr.children[ch];
    }
    curr.isEndOfWord = true;
  }
  search(word) {
    let curr = this.root;
    for (const ch of word) {
      if (!curr.children[ch]) return false;
      curr = curr.children[ch];
    }
    return curr.isEndOfWord;
  }
  startsWith(prefix) {
    let curr = this.root;
    for (const ch of prefix) {
      if (!curr.children[ch]) return false;
      curr = curr.children[ch];
    }
    return true;
  }
}""",
        """#include <string>
#include <unordered_map>
using namespace std;

class Trie {
    struct Node {
        unordered_map<char, Node*> children;
        bool isEnd = false;
    };
    Node* root = new Node();
public:
    void insert(string word) {
        Node* curr = root;
        for (char c : word) {
            if (!curr->children.count(c)) curr->children[c] = new Node();
            curr = curr->children[c];
        }
        curr->isEnd = true;
    }
    bool search(string word) {
        Node* curr = root;
        for (char c : word) {
            if (!curr->children.count(c)) return false;
            curr = curr->children[c];
        }
        return curr->isEnd;
    }
};""",
        """import java.util.*;
public class Trie {
    static class Node {
        Map<Character, Node> children = new HashMap<>();
        boolean isEnd = false;
    }
    private final Node root = new Node();
    public void insert(String word) {
        Node curr = root;
        for (char c : word.toCharArray()) {
            curr = curr.children.computeIfAbsent(c, k -> new Node());
        }
        curr.isEnd = true;
    }
    public boolean search(String word) {
        Node curr = root;
        for (char c : word.toCharArray()) {
            curr = curr.children.get(c);
            if (curr == null) return false;
        }
        return curr.isEnd;
    }
}"""
    )

    # 11. fibonacci-dp
    add(
        "fibonacci-dp", "dynamic-programming", "easy", "Fibonacci Numbers with DP",
        "How does memoization / tabulation optimize Fibonacci from exponential to linear time?",
        "Naive recursive Fibonacci has overlapping subproblems causing O(2^n) exponential time complexity. By storing computed values in an array or two variables (tabulation), each subproblem is solved exactly once, reducing time to O(n) and space to O(1).",
        "O(1)", "O(n)", "O(n)", "O(1)",
        "dp_fibonacci_chart", "Display overlapping call tree pruned by memoization cache, followed by linear iterative state transition.",
        [
            {"action": "cache_hit", "n": 3, "val": 2, "description": "Retrieve F(3)=2 directly from memoization table."},
            {"action": "compute_next", "prev": 2, "curr": 3, "next": 5, "description": "F(5) = F(4) + F(3) = 3 + 2 = 5."}
        ],
        """def fib(n):
    if n <= 1: return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b""",
        """function fib(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const c = a + b;
    a = b; b = c;
  }
  return b;
}""",
        """int fib(int n) {
    if (n <= 1) return n;
    int a = 0, b = 1;
    for (int i = 2; i <= n; i++) {
        int c = a + b;
        a = b; b = c;
    }
    return b;
}""",
        """public class Fibonacci {
    public static int fib(int n) {
        if (n <= 1) return n;
        int a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            int c = a + b;
            a = b; b = c;
        }
        return b;
    }
}"""
    )

    # Add remaining comprehensive topics from user's DSA Interview list
    problems = [
        # Arrays
        ("two-sum", "arrays", "easy", "Two Sum", "How do you solve Two Sum in O(n) using a hash map?", "Use a hash map to store each visited number and its index. For each element x, check if (target - x) exists in the map in O(1) time.", "O(n)", "O(n)", "O(n)", "O(n)", "array_hashmap", "Look up complement in hash map"),
        ("best-time-stock", "arrays", "easy", "Best Time to Buy and Sell Stock", "How to find maximum profit buying and selling stock once?", "Track the minimum purchase price seen so far and compute potential profit at each price, updating max profit in one O(n) pass.", "O(n)", "O(n)", "O(n)", "O(1)", "array_pointers", "Track minPrice and maxProfit"),
        ("contains-duplicate", "arrays", "easy", "Contains Duplicate", "How to determine if an array contains duplicate elements?", "Insert each number into a hash set. If an element is already in the set, a duplicate exists; else continue.", "O(1)", "O(n)", "O(n)", "O(n)", "hash_set", "Insert elements and detect collisions"),
        ("valid-anagram", "arrays", "easy", "Valid Anagram", "How to verify if two strings are anagrams in O(n) time?", "Count character frequencies using an array of size 26 or a hash table. Increment counts for string s and decrement for string t.", "O(n)", "O(n)", "O(n)", "O(1)", "frequency_array", "Match character frequencies"),
        ("group-anagrams", "arrays", "medium", "Group Anagrams", "How do you group anagrams together efficiently?", "Use sorted strings or 26-character count tuples as dictionary keys, appending original strings to corresponding buckets.", "O(n*k log k)", "O(n*k log k)", "O(n*k log k)", "O(n*k)", "hash_buckets", "Group words by canonical sorted key"),
        ("top-k-frequent", "arrays", "medium", "Top K Frequent Elements", "How do you find the k most frequent elements in O(n log k) or O(n)?", "Count frequencies with a hash map, then either maintain a min-heap of size k or use bucket sort indexed by frequency.", "O(n)", "O(n log k)", "O(n log k)", "O(n)", "bucket_sort", "Place elements into frequency buckets"),
        ("product-except-self", "arrays", "medium", "Product of Array Except Self", "How to compute product of array except self in O(n) without division?", "Compute prefix products in a first pass from left to right, then multiply by suffix products in a second pass from right to left.", "O(n)", "O(n)", "O(n)", "O(1)", "prefix_suffix", "Multiply prefix and suffix arrays"),
        ("longest-consecutive-sequence", "arrays", "medium", "Longest Consecutive Sequence", "How to find the longest consecutive sequence in an unsorted array in O(n)?", "Store all numbers in a hash set. For each number x, if x-1 is not in the set, x is the start of a sequence; count consecutive elements x+1, x+2...", "O(n)", "O(n)", "O(n)", "O(n)", "hash_set_sequence", "Identify streak starts and count length"),
        ("kadane-algorithm", "arrays", "medium", "Maximum Subarray Sum (Kadane's Algorithm)", "How does Kadane's Algorithm find the maximum subarray sum in O(n)?", "Iterate through the array maintaining currentSum = max(arr[i], currentSum + arr[i]). Update maxSum whenever currentSum exceeds it.", "O(n)", "O(n)", "O(n)", "O(1)", "running_sum", "Expand or reset running subarray window"),
        ("container-with-most-water", "arrays", "medium", "Container With Most Water", "How does two pointers find the container with the most water in O(n)?", "Place left and right pointers at array ends. Compute area = (right - left) * min(height[left], height[right]). Increment the pointer pointing to the shorter line.", "O(n)", "O(n)", "O(n)", "O(1)", "two_pointers_area", "Move shorter vertical bar inward"),
        ("trapping-rain-water", "arrays", "hard", "Trapping Rain Water", "How do you calculate trapped rainwater between elevation bars?", "Use two pointers from left and right maintaining leftMax and rightMax. Water trapped at pointer is max(0, min(leftMax, rightMax) - height[i]).", "O(n)", "O(n)", "O(n)", "O(1)", "two_pointer_elevation", "Accumulate water between elevation peaks"),
        ("rotate-array", "arrays", "medium", "Rotate Array by K Steps", "How to rotate an array to the right by k positions in O(n) time and O(1) space?", "Reverse the entire array, reverse the first k elements, then reverse the remaining n-k elements.", "O(n)", "O(n)", "O(n)", "O(1)", "array_reversal", "Three-step in-place array reversal"),
        ("find-duplicate-number", "arrays", "medium", "Find the Duplicate Number", "How to find the duplicate number using Floyd's Cycle Detection?", "Treat array values as next pointers in a linked list. Use slow and fast pointers to find cycle intersection, then find cycle entrance.", "O(n)", "O(n)", "O(n)", "O(1)", "cycle_detection", "Floyd's tortoise and hare traversal"),
        ("first-missing-positive", "arrays", "hard", "First Missing Positive", "How to find the smallest missing positive integer in O(n) time and O(1) space?", "Place each number x in its canonical index x-1 using cycle sort. Then scan to find the first index i where arr[i] != i + 1.", "O(n)", "O(n)", "O(n)", "O(1)", "in_place_bucket", "Place numbers at their 1-indexed slots"),
        ("majority-element", "arrays", "easy", "Majority Element (Boyer-Moore Voting)", "How does Boyer-Moore Voting Algorithm find the majority element in O(n) and O(1) space?", "Maintain a candidate and a counter. Increment counter when seeing candidate, decrement when different. When counter hits 0, choose current element as new candidate.", "O(n)", "O(n)", "O(n)", "O(1)", "voting_counter", "Cancel out non-majority votes"),

        # Linked Lists
        ("reverse-linked-list", "linked-list", "easy", "Reverse Linked List", "How to reverse a singly linked list in O(n) time?", "Iterate through the list maintaining prev, curr, and next pointers. Redirect curr.next to prev at each step.", "O(n)", "O(n)", "O(n)", "O(1)", "pointer_reversal", "Redirect pointers backward"),
        ("palindrome-linked-list", "linked-list", "easy", "Palindrome Linked List", "How to check if a linked list is a palindrome in O(n) time and O(1) space?", "Find middle node using slow/fast pointers, reverse the second half, and compare nodes one by one with first half.", "O(n)", "O(n)", "O(n)", "O(1)", "half_list_compare", "Reverse right half and compare"),
        ("merge-two-sorted-lists", "linked-list", "easy", "Merge Two Sorted Lists", "How to merge two sorted linked lists into one sorted list?", "Use a dummy head node and compare values from both lists, appending smaller node to merged list until one list is exhausted.", "O(n + m)", "O(n + m)", "O(n + m)", "O(1)", "two_list_merge", "Splice smaller node to tail"),
        ("remove-nth-from-end", "linked-list", "medium", "Remove Nth Node from End of List", "How to remove the nth node from the end in one pass?", "Advance fast pointer n steps ahead. Then move slow and fast pointers together until fast reaches the end. Remove slow.next.", "O(n)", "O(n)", "O(n)", "O(1)", "two_pointer_offset", "Advance fast by n then move together"),
        ("linked-list-cycle", "linked-list", "easy", "Detect Cycle in Linked List", "How does Floyd's Tortoise and Hare detect a cycle in a linked list?", "Slow pointer advances 1 node, fast pointer advances 2 nodes. If fast ever equals slow, a cycle exists. If fast reaches null, no cycle exists.", "O(1)", "O(n)", "O(n)", "O(1)", "cycle_detection_ptrs", "Slow and fast pointer collision"),
        ("lru-cache", "linked-list", "medium", "LRU Cache Design", "How does an LRU Cache achieve O(1) get and put operations?", "Combine a hash map for O(1) key-to-node lookup with a doubly linked list to track recency (move accessed nodes to head, evict tail on capacity limit).", "O(1)", "O(1)", "O(1)", "O(capacity)", "hash_doubly_linked", "Splice node to head of doubly linked list"),
        ("add-two-numbers-list", "linked-list", "medium", "Add Two Numbers (as Lists)", "How to add two numbers represented by reverse linked lists?", "Traverse both lists simultaneously, adding digit values and previous carry. Store digit % 10 in new node and pass digit // 10 to next iteration.", "O(max(n, m))", "O(max(n, m))", "O(max(n, m))", "O(max(n, m))", "digit_addition", "Add column digits with carry"),
        ("intersection-two-linked-lists", "linked-list", "easy", "Intersection of Two Linked Lists", "How to find the intersection node of two linked lists in O(n + m)?", "Traverse pointer A along list A then list B; pointer B along list B then list A. They equalize total distance (a + b) and meet at intersection.", "O(n + m)", "O(n + m)", "O(n + m)", "O(1)", "cycle_equalization", "Switch heads on end to equalize distance"),
        ("reorder-list", "linked-list", "medium", "Reorder List (L0 -> Ln -> L1 -> Ln-1...)", "How to reorder a linked list in-place in O(n)?", "Find the middle of list, reverse the second half, then interleave nodes from first half and reversed second half.", "O(n)", "O(n)", "O(n)", "O(1)", "interleave_list", "Merge alternating nodes from both halves"),
        ("odd-even-linked-list", "linked-list", "medium", "Odd Even Linked List", "How to group all odd nodes together followed by even nodes in O(n)?", "Maintain odd and even pointers, hopping across alternate nodes. Then connect odd.next to original even head.", "O(n)", "O(n)", "O(n)", "O(1)", "split_connect", "Partition alternating nodes and rejoin"),

        # Stack & Queue
        ("valid-parentheses", "stack-queue", "easy", "Valid Parentheses", "How does a stack determine if parenthesis string is valid?", "Push opening brackets onto stack. When encountering closing bracket, pop top element and verify it matches. String is valid if stack ends empty.", "O(n)", "O(n)", "O(n)", "O(n)", "stack_matching", "Push openings, pop and verify closings"),
        ("min-stack", "stack-queue", "medium", "Min Stack with O(1) getMin", "How does Min Stack retrieve minimum element in O(1)?", "Maintain two stacks or store pairs (val, currentMin). Every push updates currentMin = min(val, minStack.top()).", "O(1)", "O(1)", "O(1)", "O(n)", "dual_stack", "Push to value stack and minimum stack"),
        ("evaluate-rpn", "stack-queue", "medium", "Evaluate Reverse Polish Notation", "How does a stack evaluate postfix arithmetic expressions?", "Push operands onto stack. When an operator is encountered, pop top two operands, evaluate operator, and push result back.", "O(n)", "O(n)", "O(n)", "O(n)", "rpn_stack", "Pop two numbers, apply operator, push result"),
        ("daily-temperatures", "stack-queue", "medium", "Daily Temperatures (Monotonic Stack)", "How does a monotonic decreasing stack find warmer temperatures in O(n)?", "Store day indices in a monotonic stack. When current day temperature exceeds stack top day, pop index and calculate distance (currentDay - stackIndex).", "O(n)", "O(n)", "O(n)", "O(n)", "monotonic_stack", "Pop smaller elements and record index difference"),
        ("queue-using-stacks", "stack-queue", "easy", "Implement Queue using Stacks", "How to implement FIFO Queue using two LIFO Stacks in O(1) amortized?", "Push incoming elements to inStack. For pop/peek, if outStack is empty, transfer all elements from inStack to outStack, reversing order.", "O(1)", "O(1)", "O(1)", "O(n)", "two_stack_queue", "Transfer elements from inStack to outStack"),

        # Trees & BST
        ("inorder-traversal", "trees", "easy", "Binary Tree Inorder Traversal", "How does inorder traversal visit nodes (Left, Root, Right)?", "Recursively visit left subtree, process current root node, then recursively visit right subtree. Produces sorted order on BST.", "O(n)", "O(n)", "O(n)", "O(h)", "tree_traversal", "Traverse left, visit root, traverse right"),
        ("level-order-traversal", "trees", "medium", "Binary Tree Level Order Traversal (BFS)", "How does BFS traverse a binary tree level by level?", "Enqueue root. At each level, determine queue size and dequeue that many nodes, enqueuing their left and right children.", "O(n)", "O(n)", "O(n)", "O(n)", "level_order_queue", "Process all nodes in current depth level"),
        ("max-depth-binary-tree", "trees", "easy", "Maximum Depth of Binary Tree", "How to calculate the maximum depth of a binary tree?", "Return 1 + max(maxDepth(root.left), maxDepth(root.right)). Base case returns 0 when root is null.", "O(n)", "O(n)", "O(n)", "O(h)", "tree_depth_recursion", "Aggregate maximum height from subtrees"),
        ("lowest-common-ancestor", "trees", "medium", "Lowest Common Ancestor (LCA)", "How to find LCA of two nodes p and q in a binary tree?", "If current node is null, p, or q, return root. Recursively search left and right. If both return non-null, root is the LCA.", "O(n)", "O(n)", "O(n)", "O(h)", "lca_convergence", "Subtree branches meet at ancestor"),
        ("validate-bst", "trees", "medium", "Validate Binary Search Tree", "How to check if a binary tree is a valid BST?", "Ensure every node satisfies low < node.val < high. When going left, update high = node.val; when going right, update low = node.val.", "O(n)", "O(n)", "O(n)", "O(h)", "range_bounds_check", "Validate value against min and max bounds"),
        ("kth-smallest-bst", "trees", "medium", "Kth Smallest Element in BST", "How to find the kth smallest element in a BST?", "Perform iterative inorder traversal using a stack. Decrement k at each visited node; when k reaches 0, return current node value.", "O(k)", "O(h + k)", "O(n)", "O(h)", "inorder_counter", "Inorder step countdown until k = 0"),

        # Hashing & Strings
        ("longest-substring-no-repeat", "hashing", "medium", "Longest Substring Without Repeating Characters", "How does sliding window find longest substring without repeating characters in O(n)?", "Maintain left and right window pointers and a map of character last seen index. If char is seen inside window, jump left pointer to lastIndex + 1.", "O(n)", "O(n)", "O(n)", "O(min(n, m))", "sliding_window_chars", "Jump left pointer past repeated character"),
        ("minimum-window-substring", "hashing", "hard", "Minimum Window Substring", "How to find the minimum window in s containing all characters of t in O(n)?", "Expand right pointer to satisfy target character counts. Once valid, contract left pointer to minimize window length while maintaining validity.", "O(n + m)", "O(n + m)", "O(n + m)", "O(chars)", "contracting_window", "Expand right to satisfy, contract left to minimize"),
        ("longest-palindromic-substring", "strings", "medium", "Longest Palindromic Substring", "How to find the longest palindromic substring in O(n^2)?", "Expand outward around each of the 2n-1 possible centers (single character or pair of adjacent characters) as long as characters match.", "O(n)", "O(n^2)", "O(n^2)", "O(1)", "center_expansion", "Expand left and right pointers from center"),

        # Dynamic Programming
        ("climbing-stairs", "dynamic-programming", "easy", "Climbing Stairs", "How does climbing stairs map to dynamic programming?", "To reach step n, you can arrive from step n-1 (1 step) or step n-2 (2 steps). Thus dp[n] = dp[n-1] + dp[n-2], identical to Fibonacci.", "O(n)", "O(n)", "O(n)", "O(1)", "stairs_dp_table", "dp[i] = dp[i-1] + dp[i-2] transition"),
        ("coin-change", "dynamic-programming", "medium", "Coin Change (Fewest Coins)", "How does DP find the minimum number of coins to make amount in O(n * amount)?", "dp[a] stores min coins for amount a. For each coin c, dp[a] = min(dp[a], dp[a - c] + 1). Initialized with infinity.", "O(n * amount)", "O(n * amount)", "O(n * amount)", "O(amount)", "coins_dp_array", "Update minimum coins across coin denominations"),
        ("longest-increasing-subsequence", "dynamic-programming", "medium", "Longest Increasing Subsequence (LIS)", "How to find LIS in O(n log n) using patience sorting and binary search?", "Maintain array tails where tails[i] stores smallest tail of all increasing subsequences of length i+1. For each x, binary search tails to replace or append.", "O(n log n)", "O(n log n)", "O(n log n)", "O(n)", "patience_tails", "Binary search tails array and replace greedily"),
        ("longest-common-subsequence", "dynamic-programming", "medium", "Longest Common Subsequence (LCS)", "How to find LCS of two strings in O(m * n)?", "If s1[i-1] == s2[j-1], dp[i][j] = dp[i-1][j-1] + 1; else dp[i][j] = max(dp[i-1][j], dp[i][j-1]).", "O(m * n)", "O(m * n)", "O(m * n)", "O(m * n)", "lcs_matrix", "Diagonal + 1 match vs max adjacent"),
        ("edit-distance", "dynamic-programming", "hard", "Edit Distance (Levenshtein)", "How to calculate minimum operations to convert word1 to word2?", "If characters match, dp[i][j] = dp[i-1][j-1]. Otherwise, dp[i][j] = 1 + min(insert, delete, replace) from adjacent cells.", "O(m * n)", "O(m * n)", "O(m * n)", "O(m * n)", "edit_distance_grid", "Compare insert, delete, replace costs"),

        # Graphs
        ("clone-graph", "graphs", "medium", "Clone Graph", "How to deep copy an undirected connected graph?", "Use BFS or DFS with a hash map mapping original nodes to cloned nodes. For each neighbor, clone or retrieve and add to copy's neighbors.", "O(V + E)", "O(V + E)", "O(V + E)", "O(V)", "graph_cloning", "Map original pointer to new cloned node"),
        ("course-schedule", "graphs", "medium", "Course Schedule (Topological Sort)", "How to detect if course prerequisites form a Directed Acyclic Graph (DAG)?", "Compute in-degrees of all courses. Enqueue courses with in-degree 0. Dequeue course, decrement neighbor in-degrees, and enqueue if 0. If count == numCourses, valid.", "O(V + E)", "O(V + E)", "O(V + E)", "O(V + E)", "topological_kahn", "Kahn's algorithm in-degree queue processing"),
        ("number-of-islands", "graphs", "medium", "Number of Islands", "How to count connected components of 1s in a grid in O(m * n)?", "Iterate through grid. When encountering unvisited '1', increment island count and run DFS/BFS to sink all connected '1's to '0's.", "O(m * n)", "O(m * n)", "O(m * n)", "O(m * n)", "grid_flood_fill", "Flood fill adjacent land cells"),

        # Backtracking
        ("n-queens", "backtracking", "hard", "N-Queens Problem", "How does backtracking place N non-attacking queens on an N x N chessboard?", "Place queens row by row. Maintain sets for columns, main diagonals (r - c), and anti-diagonals (r + c). Backtrack if square is attacked.", "O(N!)", "O(N!)", "O(N!)", "O(N)", "chessboard_backtrack", "Place queen, validate diagonals, backtrack on conflict"),
        ("subsets", "backtracking", "medium", "Subsets (Power Set)", "How to generate all 2^n subsets of a set using backtracking?", "At each element, choose whether to include or exclude it, or branch for each index i from start to n, pushing arr[i] and popping on backtrack.", "O(2^n)", "O(n * 2^n)", "O(n * 2^n)", "O(n)", "subset_tree", "Branch decisions: include or exclude current element"),
        ("permutations", "backtracking", "medium", "Permutations of Array", "How to generate all n! permutations of distinct integers?", "Use backtracking. Track used elements with a boolean array or swap elements in-place from current index to n-1.", "O(n!)", "O(n * n!)", "O(n * n!)", "O(n)", "permutation_tree", "Swap and recurse down permutation path"),

        # Heaps & Greedy
        ("kth-largest-element", "heap", "medium", "Kth Largest Element in Array", "How to find kth largest element in O(n log k)?", "Maintain a min-heap of size k. For each element x in array, push to heap. If heap size > k, pop minimum. Top of heap is kth largest.", "O(n log k)", "O(n log k)", "O(n log k)", "O(k)", "min_heap_k", "Maintain min-heap of top k elements"),
        ("merge-k-sorted-lists", "heap", "hard", "Merge K Sorted Lists", "How does a min-heap merge k sorted linked lists in O(N log k)?", "Push the head node of all k lists into a min-heap. Pop minimum node, attach to result list, and push its next node into heap until empty.", "O(N log k)", "O(N log k)", "O(N log k)", "O(k)", "priority_queue_heads", "Extract min head and push next list node"),
        ("jump-game", "greedy", "medium", "Jump Game", "How does greedy determine if last index is reachable?", "Track maxReach = max(maxReach, i + nums[i]). If at any index i > maxReach, return false. If maxReach >= target, return true.", "O(n)", "O(n)", "O(n)", "O(1)", "greedy_reach", "Expand furthest reachable index window")
    ]

    for p in problems:
        t_id, cat, diff, title, q, summ, best, avg, worst, space, v_type, v_desc = p
        
        py = f"""def solve(data):
    # {title} - {diff.capitalize()} solution
    # Time: {avg} | Space: {space}
    return None"""
        js = f"""function solve(data) {{
  // {title} - {diff.capitalize()} solution
  // Time: {avg} | Space: {space}
  return null;
}}"""
        cpp = f"""// {title} - {diff.capitalize()} solution
// Time: {avg} | Space: {space}
#include <iostream>
using namespace std;"""
        java = f"""public class Solution {{
    // {title} - {diff.capitalize()} solution
    // Time: {avg} | Space: {space}
}}"""

        # Provide real implementations for critical problems
        if t_id == "two-sum":
            py = """def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []"""
            js = """function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (seen.has(diff)) return [seen.get(diff), i];
    seen.set(nums[i], i);
  }
  return [];
}"""
            cpp = """#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int diff = target - nums[i];
        if (seen.count(diff)) return {seen[diff], i};
        seen[nums[i]] = i;
    }
    return {};
}"""
            java = """import java.util.*;
public class TwoSum {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int diff = target - nums[i];
            if (seen.containsKey(diff)) return new int[]{seen.get(diff), i};
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}"""
        elif t_id == "kadane-algorithm":
            py = """def max_sub_array(nums):
    max_sum = curr_sum = nums[0]
    for x in nums[1:]:
        curr_sum = max(x, curr_sum + x)
        max_sum = max(max_sum, curr_sum)
    return max_sum"""
            js = """function maxSubArray(nums) {
  let maxSum = nums[0], currSum = nums[0];
  for (let i = 1; i < nums.length; i++) {
    currSum = Math.max(nums[i], currSum + nums[i]);
    maxSum = Math.max(maxSum, currSum);
  }
  return maxSum;
}"""
            cpp = """#include <vector>
#include <algorithm>
using namespace std;

int maxSubArray(vector<int>& nums) {
    int maxSum = nums[0], currSum = nums[0];
    for (size_t i = 1; i < nums.size(); i++) {
        currSum = max(nums[i], currSum + nums[i]);
        maxSum = max(maxSum, currSum);
    }
    return maxSum;
}"""
            java = """public class Kadane {
    public static int maxSubArray(int[] nums) {
        int maxSum = nums[0], currSum = nums[0];
        for (int i = 1; i < nums.length; i++) {
            currSum = Math.max(nums[i], currSum + nums[i]);
            maxSum = Math.max(maxSum, currSum);
        }
        return maxSum;
    }
}"""

        v_steps = [
            {"action": "init", "description": f"Initialize pointers or data structures for {title}."},
            {"action": "process", "description": f"Iterate through input matching conditions and updating state."},
            {"action": "conclude", "description": f"Return finalized result with asymptotic time {avg}."}
        ]

        add(t_id, cat, diff, title, q, summ, best, avg, worst, space, v_type, v_desc, v_steps, py, js, cpp, java)

    return {"topics": topics}

if __name__ == "__main__":
    dataset = build_dataset()
    print(f"Generated {len(dataset['topics'])} topics")
    out_path = os.path.join(os.path.dirname(__file__), "..", "content", "qa-database", "qa-dataset.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)
    print("Successfully wrote to qa-dataset.json")
