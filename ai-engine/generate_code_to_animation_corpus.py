#!/usr/bin/env python3
"""
Nexora Code-to-Animation Training Dataset Synthesizer
Generates paired examples where the model ingests raw programming code
(across all data structures: Trees, Graphs, Stacks, Queues, Heaps, Lists, Arrays)
and outputs the exact 3D kinetic state machine with synchronized line-by-line narration.
"""

import json
import os

SYSTEM_CODE_ANIMATOR_PROMPT = (
    "You are Nexora Code-to-Animation AI. Given any raw code snippet in C++, Python, Java, or JavaScript, "
    "you parse the algorithm line-by-line, detect the underlying data structures, and compile it into an "
    "interactive 3D kinetic animation state machine conforming to the Nexora Cyber-Matrix visualizer protocol."
)

SAMPLE_CODE_TO_ANIMATION_PAIRS = [
    # ── EXAMPLE 1: BINARY SEARCH TREE INSERTION (TREE) ──
    {
        "category": "code_to_animation",
        "data_structure": "binary_search_tree",
        "messages": [
            {"role": "system", "content": SYSTEM_CODE_ANIMATOR_PROMPT},
            {
                "role": "user",
                "content": (
                    "Convert this C++ BST insertion code into a kinetic 3D animation for inserting value 15 into a BST with root 20:\n"
                    "```cpp\n"
                    "1: TreeNode* insert(TreeNode* root, int val) {\n"
                    "2:     if (!root) return new TreeNode(val);\n"
                    "3:     if (val < root->val)\n"
                    "4:         root->left = insert(root->left, val);\n"
                    "5:     else\n"
                    "6:         root->right = insert(root->right, val);\n"
                    "7:     return root;\n"
                    "8: }\n"
                    "```"
                )
            },
            {
                "role": "assistant",
                "content": json.dumps({
                    "title": "Binary Search Tree Insertion: Inserting 15",
                    "language": "cpp",
                    "detected_data_structure": "tree",
                    "total_frames": 4,
                    "frames": [
                        {
                            "frame_index": 1,
                            "active_code_line": 1,
                            "explanation": "Function called with root node 20 and target insertion value 15.",
                            "data_structure": "tree",
                            "cells": [
                                {"id": "n20", "value": 20, "role": "active", "elevation_y": 0, "scale": 1.0},
                                {"id": "n10", "value": 10, "role": "idle", "elevation_y": 0, "scale": 1.0},
                                {"id": "n30", "value": 30, "role": "idle", "elevation_y": 0, "scale": 1.0}
                            ],
                            "pointers": {"curr": "n20"},
                            "sound_cue": "step"
                        },
                        {
                            "frame_index": 2,
                            "active_code_line": 3,
                            "explanation": "Evaluating condition: 15 < 20 is TRUE. Branching into left subtree root->left.",
                            "data_structure": "tree",
                            "cells": [
                                {"id": "n20", "value": 20, "role": "done", "elevation_y": 0, "scale": 1.0},
                                {"id": "n10", "value": 10, "role": "active", "elevation_y": -15, "scale": 1.15},
                                {"id": "n30", "value": 30, "role": "idle", "elevation_y": 0, "scale": 1.0}
                            ],
                            "pointers": {"curr": "n10"},
                            "sound_cue": "compare"
                        },
                        {
                            "frame_index": 3,
                            "active_code_line": 5,
                            "explanation": "Evaluating condition at node 10: 15 > 10. Traversing to right child (currently NULL).",
                            "data_structure": "tree",
                            "cells": [
                                {"id": "n20", "value": 20, "role": "done", "elevation_y": 0, "scale": 1.0},
                                {"id": "n10", "value": 10, "role": "done", "elevation_y": 0, "scale": 1.0},
                                {"id": "n30", "value": 30, "role": "idle", "elevation_y": 0, "scale": 1.0}
                            ],
                            "pointers": {"target_slot": "n10->right"},
                            "sound_cue": "step"
                        },
                        {
                            "frame_index": 4,
                            "active_code_line": 2,
                            "explanation": "Base case reached: root is NULL. Allocating new TreeNode(15) attached as right child of 10 in 3D orbit.",
                            "data_structure": "tree",
                            "cells": [
                                {"id": "n20", "value": 20, "role": "done", "elevation_y": 0, "scale": 1.0},
                                {"id": "n10", "value": 10, "role": "done", "elevation_y": 0, "scale": 1.0},
                                {"id": "n30", "value": 30, "role": "idle", "elevation_y": 0, "scale": 1.0},
                                {"id": "n15", "value": 15, "role": "swap", "elevation_y": -38, "scale": 1.25}
                            ],
                            "pointers": {"new_node": "n15"},
                            "sound_cue": "done"
                        }
                    ]
                }, indent=2)
            }
        ]
    },

    # ── EXAMPLE 2: MONOTONIC STACK (STACK) ──
    {
        "category": "code_to_animation",
        "data_structure": "stack",
        "messages": [
            {"role": "system", "content": SYSTEM_CODE_ANIMATOR_PROMPT},
            {
                "role": "user",
                "content": (
                    "Convert this Python Monotonic Stack code for Next Greater Element on [2, 1, 5] into an animation:\n"
                    "```python\n"
                    "1: stack = []\n"
                    "2: for num in [2, 1, 5]:\n"
                    "3:     while stack and stack[-1] < num:\n"
                    "4:         popped = stack.pop()\n"
                    "5:     stack.append(num)\n"
                    "```"
                )
            },
            {
                "role": "assistant",
                "content": json.dumps({
                    "title": "Monotonic Stack: Next Greater Element",
                    "language": "python",
                    "detected_data_structure": "stack",
                    "total_frames": 5,
                    "frames": [
                        {
                            "frame_index": 1,
                            "active_code_line": 1,
                            "explanation": "Initialize empty stack.",
                            "data_structure": "stack",
                            "cells": [],
                            "pointers": {},
                            "sound_cue": "step"
                        },
                        {
                            "frame_index": 2,
                            "active_code_line": 5,
                            "explanation": "Processing num = 2. Stack is empty, append 2 to stack top.",
                            "data_structure": "stack",
                            "cells": [{"id": "s0", "value": 2, "role": "done", "elevation_y": 0, "scale": 1.0}],
                            "pointers": {"top": 0},
                            "sound_cue": "step"
                        },
                        {
                            "frame_index": 3,
                            "active_code_line": 5,
                            "explanation": "Processing num = 1. Top of stack (2) > 1, so append 1 maintaining decreasing monotonicity.",
                            "data_structure": "stack",
                            "cells": [
                                {"id": "s0", "value": 2, "role": "done", "elevation_y": 0, "scale": 1.0},
                                {"id": "s1", "value": 1, "role": "done", "elevation_y": 0, "scale": 1.0}
                            ],
                            "pointers": {"top": 1},
                            "sound_cue": "step"
                        },
                        {
                            "frame_index": 4,
                            "active_code_line": 4,
                            "explanation": "Processing num = 5. Since 5 > top (1), pop 1 from stack in high-velocity upward trajectory!",
                            "data_structure": "stack",
                            "cells": [
                                {"id": "s0", "value": 2, "role": "done", "elevation_y": 0, "scale": 1.0},
                                {"id": "s1", "value": 1, "role": "swap", "elevation_y": -45, "scale": 1.2}
                            ],
                            "pointers": {"popping": 1},
                            "sound_cue": "swap"
                        },
                        {
                            "frame_index": 5,
                            "active_code_line": 5,
                            "explanation": "5 > 2 as well, so 2 is popped. Finally 5 is pushed as new stack leader.",
                            "data_structure": "stack",
                            "cells": [{"id": "s2", "value": 5, "role": "active", "elevation_y": 0, "scale": 1.1}],
                            "pointers": {"top": 0},
                            "sound_cue": "done"
                        }
                    ]
                }, indent=2)
            }
        ]
    }
]

def generate_code_animation_corpus(output_path="ai-engine/data/code_to_animation_corpus.jsonl"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for item in SAMPLE_CODE_TO_ANIMATION_PAIRS:
            f.write(json.dumps(item["messages"]) + "\n")
    print(f"[✓] Generated Code-to-Animation corpus: {output_path}")

if __name__ == "__main__":
    generate_code_animation_corpus()
