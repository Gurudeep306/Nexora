#!/usr/bin/env python3
"""
Nexora-Core Dataset Generator
Generates high-quality instruction-tuning dataset (JSONL) formatted for Qwen2.5-Coder.
Includes 4 specialized capabilities:
1. Socratic doubt clearing (hints, complexity, intuition)
2. Competitive programming code debugging (TLE, WA, MLE, off-by-one)
3. Interactive animation frame generation (Nexora VizPlayer JSON protocol)
4. Editorial code & optimal complexity analysis
"""

import json
import os
import random

SYSTEM_PROMPT = (
    "You are Nexora-Core, the proprietary AI engine for the Nexora competitive programming "
    "and DSA platform. You possess deep algorithmic reasoning, socratic teaching pedagogy, "
    "and the ability to produce frame-by-frame visual state machines for the Nexora visualizer."
)

SAMPLE_TRAINING_PAIRS = [
    # ── TASK 1: SOCRATIC DOUBT SOLVING ──
    {
        "category": "doubt_solving",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": "I'm solving 3Sum. My current solution sorts the array and runs three nested loops, but I get Time Limit Exceeded (TLE) on N=3000. Why and how can I fix it without full code?"
            },
            {
                "role": "assistant",
                "content": (
                    "### 1. Why You're Getting TLE\n"
                    "With three nested loops, your time complexity is **O(N³)**. When `N = 3,000`, N³ is roughly **2.7 × 10¹⁰ operations**.\n"
                    "Most online judges (including Nexora) allow ~10⁸ operations per second (1–2 seconds limit). Your code takes ~270 seconds, which triggers TLE.\n\n"
                    "### 2. Intuition for the Fix\n"
                    "Notice that you already sorted the array — that's a huge clue! Once sorted:\n"
                    "1. Fix the first element `nums[i]` with one loop (O(N)).\n"
                    "2. Now you need two remaining numbers `nums[j] + nums[k] == -nums[i]`.\n"
                    "3. Since the remainder of the array is already sorted, can you find those two numbers in **O(N)** time instead of O(N²)?\n\n"
                    "### 3. Socratic Hint\n"
                    "Think about placing one pointer at `i + 1` (the smallest remaining) and one pointer at `N - 1` (the largest remaining).\n"
                    "- What should you do if the sum is too small?\n"
                    "- What should you do if the sum is too large?\n"
                    "This brings the overall complexity down from **O(N³) to O(N²)**, taking only ~9 × 10⁶ operations for N=3,000!"
                )
            }
        ]
    },
    {
        "category": "doubt_solving",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": "When should I use Dijkstra vs BFS vs Bellman-Ford on a shortest path problem?"
            },
            {
                "role": "assistant",
                "content": (
                    "Here is the Nexora mental model for shortest paths on graphs:\n\n"
                    "| Algorithm | Edge Weights | Time Complexity | When to Choose |\n"
                    "|---|---|---|---|\n"
                    "| **BFS** | Unweighted (or all weight = 1) | O(V + E) | Finding shortest hops in minimum time. |\n"
                    "| **0-1 BFS** | Weights only 0 or 1 | O(V + E) with deque | Fast alternative to Dijkstra when transitions cost 0 or 1. |\n"
                    "| **Dijkstra** | Non-negative weights (≥ 0) | O((V + E) log V) with Min-Heap | Standard single-source shortest path with varied positive costs. |\n"
                    "| **Bellman-Ford** | Can have negative weights | O(V × E) | When negative edges exist or you must detect negative weight cycles. |\n"
                    "| **Floyd-Warshall**| Any (small V ≤ 400) | O(V³) | All-pairs shortest path between every node. |\n\n"
                    "**Golden Rule**: If all edges are 1, **never** use Dijkstra — BFS is faster and simpler."
                )
            }
        ]
    },

    # ── TASK 2: COMPETITIVE PROGRAMMING DEBUGGING ──
    {
        "category": "code_debugging",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "My binary search has an infinite loop on `nums = [1, 3]`, target = 2:\n"
                    "```cpp\n"
                    "int l = 0, r = nums.size() - 1;\n"
                    "while (l < r) {\n"
                    "    int mid = (l + r) / 2;\n"
                    "    if (nums[mid] >= target) r = mid;\n"
                    "    else l = mid;\n"
                    "}\n"
                    "```\n"
                    "Where is the bug?"
                )
            },
            {
                "role": "assistant",
                "content": (
                    "### The Root Cause: Integer Division Truncation\n"
                    "Look closely at the line: `int mid = (l + r) / 2;` paired with `else l = mid;`.\n\n"
                    "1. When `l = 0` and `r = 1`:\n"
                    "   - `mid = (0 + 1) / 2 = 0`.\n"
                    "   - `nums[0] = 1`, which is `< 2`, so the `else` branch runs: `l = mid = 0`.\n"
                    "   - In the next iteration, `l` is still `0` and `r` is still `1`! The state never changes, causing an **infinite loop**.\n\n"
                    "### The Two Fixes\n"
                    "**Fix 1 (Standard Closed Interval `l <= r`):**\n"
                    "```cpp\n"
                    "int l = 0, r = nums.size() - 1;\n"
                    "while (l <= r) {\n"
                    "    int mid = l + (r - l) / 2;\n"
                    "    if (nums[mid] == target) return mid;\n"
                    "    else if (nums[mid] < target) l = mid + 1;\n"
                    "    else r = mid - 1;\n"
                    "}\n"
                    "```\n"
                    "**Fix 2 (Lower Bound `l < r` with `l = mid + 1`):**\n"
                    "```cpp\n"
                    "while (l < r) {\n"
                    "    int mid = l + (r - l) / 2;\n"
                    "    if (nums[mid] >= target) r = mid;\n"
                    "    else l = mid + 1; // notice mid + 1 ensures progress\n"
                    "}\n"
                    "```"
                )
            }
        ]
    },

    # ── TASK 3: ANIMATION & VISUAL STATE MACHINE GENERATION ──
    {
        "category": "animation_generation",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": "Generate a visual step animation for reversing array [1, 2, 3, 4] using two pointers."
            },
            {
                "role": "assistant",
                "content": json.dumps({
                    "type": "nexora_visualization",
                    "title": "Reverse Array (Two Pointers)",
                    "data_structure": "array",
                    "description": "Swapping elements at left and right pointers moving towards the center.",
                    "frames": [
                        {
                            "step": 1,
                            "explanation": "Initialize left pointer at index 0 and right pointer at index 3.",
                            "state": {
                                "kind": "array",
                                "id": "arr",
                                "cells": [{"id": "c0", "v": 1}, {"id": "c1", "v": 2}, {"id": "c2", "v": 3}, {"id": "c3", "v": 4}],
                                "pointers": {"left": 0, "right": 3},
                                "roles": {0: "active", 3: "active"}
                            }
                        },
                        {
                            "step": 2,
                            "explanation": "Swap elements 1 and 4.",
                            "state": {
                                "kind": "array",
                                "id": "arr",
                                "cells": [{"id": "c3", "v": 4}, {"id": "c1", "v": 2}, {"id": "c2", "v": 3}, {"id": "c0", "v": 1}],
                                "pointers": {"left": 0, "right": 3},
                                "roles": {0: "swap", 3: "swap"}
                            }
                        },
                        {
                            "step": 3,
                            "explanation": "Move left to index 1, move right to index 2.",
                            "state": {
                                "kind": "array",
                                "id": "arr",
                                "cells": [{"id": "c3", "v": 4}, {"id": "c1", "v": 2}, {"id": "c2", "v": 3}, {"id": "c0", "v": 1}],
                                "pointers": {"left": 1, "right": 2},
                                "roles": {0: "done", 1: "active", 2: "active", 3: "done"}
                            }
                        },
                        {
                            "step": 4,
                            "explanation": "Swap elements 2 and 3.",
                            "state": {
                                "kind": "array",
                                "id": "arr",
                                "cells": [{"id": "c3", "v": 4}, {"id": "c2", "v": 3}, {"id": "c1", "v": 2}, {"id": "c0", "v": 1}],
                                "pointers": {"left": 1, "right": 2},
                                "roles": {1: "swap", 2: "swap"}
                            }
                        },
                        {
                            "step": 5,
                            "explanation": "Pointers cross (left > right). Array is fully reversed: [4, 3, 2, 1].",
                            "state": {
                                "kind": "array",
                                "id": "arr",
                                "cells": [{"id": "c3", "v": 4}, {"id": "c2", "v": 3}, {"id": "c1", "v": 2}, {"id": "c0", "v": 1}],
                                "roles": {0: "done", 1: "done", 2: "done", 3: "done"}
                            }
                        }
                    ]
                }, indent=2)
            }
        ]
    },

    # ── TASK 4: EDITORIAL & MULTI-LANGUAGE CODE GENERATION ──
    {
        "category": "editorial_code",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": "Provide optimal code for Longest Consecutive Sequence in O(N) time with C++ and Python."
            },
            {
                "role": "assistant",
                "content": (
                    "### Problem: Longest Consecutive Sequence\n"
                    "**Goal**: Find length of longest sequence of consecutive numbers in unsorted array in **O(N) time**.\n\n"
                    "### Technique: Hash Set Streak Detection\n"
                    "1. Insert all numbers into an `unordered_set` (hash set) for O(1) lookup.\n"
                    "2. Only begin counting a streak if `num - 1` is NOT in the set (this ensures we only start from sequence origins, keeping total lookups bounded by 2N).\n\n"
                    "```cpp\n"
                    "// C++20 Optimal O(N) Time, O(N) Space\n"
                    "#include <vector>\n"
                    "#include <unordered_set>\n"
                    "#include <algorithm>\n\n"
                    "int longestConsecutive(const std::vector<int>& nums) {\n"
                    "    std::unordered_set<int> pool(nums.begin(), nums.end());\n"
                    "    int longest = 0;\n\n"
                    "    for (int x : pool) {\n"
                    "        // Only start if x is the beginning of a streak\n"
                    "        if (!pool.count(x - 1)) {\n"
                    "            int curr = x;\n"
                    "            int streak = 1;\n"
                    "            while (pool.count(curr + 1)) {\n"
                    "                curr++;\n"
                    "                streak++;\n"
                    "            }\n"
                    "            longest = std::max(longest, streak);\n"
                    "        }\n"
                    "    }\n"
                    "    return longest;\n"
                    "}\n"
                    "```\n\n"
                    "```python\n"
                    "# Python 3 Optimal O(N) Time, O(N) Space\n"
                    "def longestConsecutive(nums: list[int]) -> int:\n"
                    "    pool = set(nums)\n"
                    "    longest = 0\n\n"
                    "    for x in pool:\n"
                    "        if x - 1 not in pool:\n"
                    "            curr = x\n"
                    "            streak = 1\n"
                    "            while curr + 1 in pool:\n"
                    "                curr += 1\n"
                    "                streak += 1\n"
                    "            longest = max(longest, streak)\n\n"
                    "    return longest\n"
                    "```"
                )
            }
        ]
    }
]

def generate_dataset(output_dir="ai-engine/data", val_split=0.1):
    os.makedirs(output_dir, exist_ok=True)
    all_samples = list(SAMPLE_TRAINING_PAIRS)
    
    # We can multiply / augment templates for robust training
    random.seed(42)
    random.shuffle(all_samples)
    
    split_idx = max(1, int(len(all_samples) * (1 - val_split)))
    train_samples = all_samples[:split_idx]
    val_samples = all_samples[split_idx:]
    
    train_path = os.path.join(output_dir, "train.jsonl")
    val_path = os.path.join(output_dir, "val.jsonl")
    
    with open(train_path, "w", encoding="utf-8") as f:
        for item in train_samples:
            f.write(json.dumps(item["messages"]) + "\n")
            
    with open(val_path, "w", encoding="utf-8") as f:
        for item in val_samples:
            f.write(json.dumps(item["messages"]) + "\n")
            
    print(f"Generated {len(train_samples)} training samples -> {train_path}")
    print(f"Generated {len(val_samples)} validation samples -> {val_path}")

if __name__ == "__main__":
    generate_dataset()
