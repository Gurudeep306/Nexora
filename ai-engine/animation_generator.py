#!/usr/bin/env python3
"""
Nexora Animation Synthesizer & Training Pipeline
Trains the AI to automatically write full, production-grade Nexora Algorithm Visualizers
identical to the animations in client/src/learn/algorithms/*.ts.

The model is trained on:
1. Multi-language polyglot code (Pseudocode, C++, Java, Python, JS, C) with line tags (//@tag).
2. Deterministic execution tracer logic using t.array(), t.tree(), t.graph(), t.grid(), t.stack().
3. Rich markdown pedagogical narration on each step.
"""

import json
import os

SYSTEM_ANIMATOR_PROMPT = (
    "You are the Nexora Master Visualizer Engine. You write production-grade, executable "
    "TypeScript algorithms conforming to the Nexora Animation Engine ('../engine/tracer' and '../engine/types'). "
    "Every algorithm you generate includes polyglot code tabs (pseudo, cpp, java, python, js, c) "
    "synchronized with step tags (//@tag) and complete tracer execution logic."
)

SAMPLE_ANIMATOR_PAIRS = [
    {
        "category": "animation_synthesis",
        "topic": "Two Pointers - Two Sum in Sorted Array",
        "messages": [
            {"role": "system", "content": SYSTEM_ANIMATOR_PROMPT},
            {
                "role": "user",
                "content": "Generate a full Nexora visualizer TypeScript module for Two Sum in a Sorted Array using Two Pointers."
            },
            {
                "role": "assistant",
                "content": '''```typescript
import { trace } from '../engine/tracer'
import type { Algorithm } from '../engine/types'
import { list, rarr, rint } from './util'

export const twoSumSorted: Algorithm = {
  id: 'two-sum-sorted',
  title: 'Two Sum in a Sorted Array — Inward Squeeze',
  inputs: [
    { name: 'arr', label: 'Sorted Array', type: 'array', default: '2 7 11 15 19 23', maxLen: 10 },
    { name: 'target', label: 'Target Sum', type: 'number', default: '26' },
  ],
  random: () => {
    const a = rarr(6, 1, 30).sort((x, y) => x - y)
    const t = a[1] + a[4]
    return { arr: list(a), target: String(t) }
  },
  code: {
    pseudo: `
function twoSum(arr, target)
  left ← 0, right ← length(arr) - 1     // @init
  while left < right                     // @loop
    sum ← arr[left] + arr[right]        // @calc
    if sum = target return [left, right] // @found
    else if sum < target left ← left + 1 // @left
    else right ← right - 1               // @right
  return null                            // @none`,
    cpp: `
vector<int> twoSum(const vector<int>& arr, int target) {
    int left = 0, right = arr.size() - 1;       // @init
    while (left < right) {                      // @loop
        int sum = arr[left] + arr[right];       // @calc
        if (sum == target) return {left, right};// @found
        else if (sum < target) left++;          // @left
        else right--;                           // @right
    }
    return {};                                  // @none
}`,
    java: `
public static int[] twoSum(int[] arr, int target) {
    int left = 0, right = arr.length - 1;       // @init
    while (left < right) {                      // @loop
        int sum = arr[left] + arr[right];       // @calc
        if (sum == target) return new int[]{left, right}; // @found
        else if (sum < target) left++;          // @left
        else right--;                           // @right
    }
    return new int[]{};                         // @none
}`,
    python: `
def two_sum(arr, target):
    left, right = 0, len(arr) - 1               # @init
    while left < right:                         # @loop
        curr = arr[left] + arr[right]           # @calc
        if curr == target: return [left, right] # @found
        elif curr < target: left += 1           # @left
        else: right -= 1                        # @right
    return None                                 # @none`,
    js: `
function twoSum(arr, target) {
  let left = 0, right = arr.length - 1          // @init
  while (left < right) {                        // @loop
    const sum = arr[left] + arr[right]          // @calc
    if (sum === target) return [left, right]    // @found
    else if (sum < target) left++               // @left
    else right--                                // @right
  }
  return null                                   // @none
}`,
    c: `
int* twoSum(const int *arr, int n, int target, int *out) {
    int left = 0, right = n - 1;                /* @init */
    while (left < right) {                      /* @loop */
        int sum = arr[left] + arr[right];       /* @calc */
        if (sum == target) {                    /* @found */
            out[0] = left; out[1] = right; return out;
        } else if (sum < target) left++;        /* @left */
        else right--;                           /* @right */
    }
    return NULL;                                /* @none */
}`,
  },
  run: ({ arr, target }) =>
    trace((t) => {
      const vals = arr as number[]
      const tgt = target as number
      const a = t.array('arr', vals, { label: 'Sorted Array (Ascending)', bars: true })

      let left = 0
      let right = vals.length - 1

      a.ptr('left', left)
      a.ptr('right', right)
      t.step('init', `Place \`left\` at start (0) and \`right\` at end (${right}). Target sum is **${tgt}**.`, {
        left,
        right,
        target: tgt,
      })

      while (left < right) {
        a.clear()
        a.ptr('left', left)
        a.ptr('right', right)
        a.role(left, 'active')
        a.role(right, 'active')

        const sum = vals[left] + vals[right]
        t.step('calc', `Summing \`arr[${left}]\` (${vals[left]}) + \`arr[${right}]\` (${vals[right]}) = **${sum}**.`, {
          left,
          right,
          sum,
          target: tgt,
        })

        if (sum === tgt) {
          a.role(left, 'found')
          a.role(right, 'found')
          t.step('found', `Exact match! **${vals[left]} + ${vals[right]} = ${tgt}**. Found indices [${left}, ${right}].`, {
            left,
            right,
            match: `${vals[left]} + ${vals[right]}`,
          })
          return
        }

        if (sum < tgt) {
          t.step('left', `Current sum ${sum} is **less than** target ${tgt}. Advance \`left\` from index ${left} to ${left + 1} to increase the sum.`, {
            left,
            nextLeft: left + 1,
          })
          left++
        } else {
          t.step('right', `Current sum ${sum} is **greater than** target ${tgt}. Decrease \`right\` from index ${right} to ${right - 1} to reduce the sum.`, {
            right,
            nextRight: right - 1,
          })
          right--
        }
      }

      t.step('none', `Pointers met without finding any pair summing to ${tgt}.`, {})
    }),
}
```'''
            }
        ]
    }
]

def generate_animation_dataset(output_file="ai-engine/data/animator_corpus.jsonl"):
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        for pair in SAMPLE_ANIMATOR_PAIRS:
            f.write(json.dumps(pair["messages"]) + "\n")
    print(f"[✓] Generated animation synthesis corpus at {output_file}")

if __name__ == "__main__":
    generate_animation_dataset()
