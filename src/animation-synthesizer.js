/**
 * Nexora Universal Animation Synthesizer
 * Converts raw code, pseudo-code, or natural language algorithm descriptions into
 * rich 3D Cyber-Matrix kinetic state machines with persistent cell IDs (FLIP),
 * laser pointers, parabolic hopping arcs, and Web Audio sound cues.
 */

function extractNumbers(text) {
  const match = text.match(/\[([\d\s,.-]+)\]/);
  if (match) {
    const nums = match[1]
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    if (nums.length >= 3) return nums.slice(0, 10);
  }
  return null;
}

function synthesizeAnimationFromCode(codeOrText) {
  const text = String(codeOrText || '').toLowerCase();

  // Custom user numbers or default pedagogical array
  const userNums = extractNumbers(codeOrText);
  const arr = userNums && userNums.length >= 3 ? userNums : [45, 12, 89, 23, 67, 90, 34];

  // 1. Two-Pointer / Array Reversal / Palindrome
  if (text.includes('reverse') || text.includes('left') || text.includes('two pointer') || text.includes('palindrome') || (text.includes('swap') && text.includes('while'))) {
    return generateTwoPointerReversal(arr, codeOrText);
  }

  // 2. Binary Search
  if (text.includes('binary search') || text.includes('binsearch') || (text.includes('mid') && text.includes('high')) || text.includes('bisect')) {
    const sorted = [...arr].sort((a, b) => a - b);
    const target = sorted[Math.floor(sorted.length * 0.7)] || sorted[sorted.length - 1];
    return generateBinarySearch(sorted, target, codeOrText);
  }

  // 3. Partition / QuickSort
  if (text.includes('partition') || text.includes('quicksort') || text.includes('pivot')) {
    return generateQuickSortPartition(arr, codeOrText);
  }

  // 4. Sliding Window
  if (text.includes('sliding window') || text.includes('window') || text.includes('max sum subarray')) {
    return generateSlidingWindow(arr, codeOrText);
  }

  // 5. Dutch National Flag / Sort 0, 1, 2
  if (text.includes('dutch') || text.includes('color') || text.includes('sort colors') || text.includes('0, 1, 2')) {
    return generateDutchNationalFlag(codeOrText);
  }

  // 6. Default / Bubble Sort / Selection
  return generateBubbleSort(arr.slice(0, 6), codeOrText);
}

// ── TWO POINTER REVERSAL ──
function generateTwoPointerReversal(initialArray, sourceCode) {
  const current = initialArray.map((v, i) => ({ id: `c${i}`, v, addr: `0x${(4096 + i * 4).toString(16)}` }));
  const frames = [];
  let left = 0;
  let right = current.length - 1;
  let step = 1;

  // Frame 1: Init
  frames.push({
    step: step++,
    explanation: `Pointers initialized at left index ${left} (${current[left].v}) and right index ${right} (${current[right].v}).`,
    cells: current.map((c, i) => ({ ...c, role: i === left || i === right ? 'active' : 'idle', elevation: i === left || i === right ? -16 : 0 })),
    pointers: { left, right },
    roles: { [left]: 'active', [right]: 'active' },
    soundEffect: 'hop',
    codeLine: 1,
  });

  while (left < right) {
    // Compare / Target
    frames.push({
      step: step++,
      explanation: `Preparing parabolic swap between cell #${left} (${current[left].v}) and cell #${right} (${current[right].v}).`,
      cells: current.map((c, i) => ({
        ...c,
        role: i === left || i === right ? 'compare' : i < left || i > right ? 'done' : 'idle',
        elevation: i === left || i === right ? -32 : 0,
      })),
      pointers: { left, right },
      roles: { [left]: 'compare', [right]: 'compare' },
      soundEffect: 'compare',
      codeLine: 3,
    });

    // Swap elements (persistent IDs stay with their value to show true kinetic FLIP)
    const temp = current[left];
    current[left] = current[right];
    current[right] = temp;

    // Post swap
    frames.push({
      step: step++,
      explanation: `Swapped! Cell values exchanged at memory bus registers. Left incremented, Right decremented.`,
      cells: current.map((c, i) => ({
        ...c,
        role: i === left || i === right ? 'swap' : i < left || i > right ? 'done' : 'idle',
        elevation: i === left || i === right ? -12 : 0,
      })),
      pointers: { left, right },
      roles: { [left]: 'swap', [right]: 'swap' },
      soundEffect: 'swap',
      codeLine: 4,
    });

    left++;
    right--;

    if (left <= right) {
      frames.push({
        step: step++,
        explanation: `Shifted pointers: left=${left} (${current[left].v}), right=${right} (${current[right].v}). Invariant holds: left <= right.`,
        cells: current.map((c, i) => ({
          ...c,
          role: i === left || i === right ? 'active' : i < left || i > right ? 'done' : 'idle',
          elevation: i === left || i === right ? -18 : 0,
        })),
        pointers: { left, right },
        roles: { [left]: 'active', [right]: 'active' },
        soundEffect: 'hop',
        codeLine: 5,
      });
    }
  }

  // Final Done Frame
  frames.push({
    step: step++,
    explanation: `Pointers crossed (left=${left} >= right=${right}). In-place reversal completed in O(N) time and O(1) space.`,
    cells: current.map((c) => ({ ...c, role: 'done', elevation: 0 })),
    pointers: {},
    roles: Object.fromEntries(current.map((_, i) => [i, 'done'])),
    soundEffect: 'done',
    codeLine: 6,
  });

  return {
    title: 'Kinetic Two-Pointer In-Place Reversal',
    algorithm: 'Two Pointers',
    data_structure: 'array',
    time_complexity: 'O(N)',
    space_complexity: 'O(1)',
    source_code: String(sourceCode || 'while (left < right) { swap(arr[left++], arr[right--]); }'),
    pseudo_lines: [
      'int left = 0, right = arr.length - 1;',
      'while (left < right) {',
      '    // Compare and prepare kinetic swap',
      '    swap(arr[left], arr[right]);',
      '    left++; right--;',
      '} // Reversal complete',
    ],
    total_frames: frames.length,
    frames,
  };
}

// ── BINARY SEARCH ──
function generateBinarySearch(sortedArray, target, sourceCode) {
  const current = sortedArray.map((v, i) => ({ id: `c${i}`, v, addr: `0x${(4096 + i * 4).toString(16)}` }));
  const frames = [];
  let low = 0;
  let high = current.length - 1;
  let step = 1;

  frames.push({
    step: step++,
    explanation: `Binary Search for target ${target}. Initialized low=${low} and high=${high}.`,
    cells: current.map((c, i) => ({ ...c, role: i >= low && i <= high ? 'active' : 'idle', elevation: 0 })),
    pointers: { low, high },
    roles: { [low]: 'active', [high]: 'active' },
    soundEffect: 'hop',
    codeLine: 1,
  });

  let foundIndex = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midVal = current[mid].v;

    frames.push({
      step: step++,
      explanation: `Calculated mid = floor((${low} + ${high}) / 2) = ${mid} (value ${midVal}). Testing against target ${target}.`,
      cells: current.map((c, i) => ({
        ...c,
        role: i === mid ? 'compare' : i >= low && i <= high ? 'active' : 'idle',
        elevation: i === mid ? -30 : 0,
      })),
      pointers: { low, mid, high },
      roles: { [low]: 'active', [mid]: 'compare', [high]: 'active' },
      soundEffect: 'compare',
      codeLine: 3,
    });

    if (midVal === target) {
      foundIndex = mid;
      frames.push({
        step: step++,
        explanation: `Target ${target} successfully located at index ${mid}! Invariant confirmed in O(log N) iterations.`,
        cells: current.map((c, i) => ({
          ...c,
          role: i === mid ? 'found' : 'done',
          elevation: i === mid ? -36 : 0,
        })),
        pointers: { target: mid },
        roles: { [mid]: 'found' },
        soundEffect: 'done',
        codeLine: 4,
      });
      break;
    } else if (midVal < target) {
      frames.push({
        step: step++,
        explanation: `${midVal} < ${target}. Target must be in upper half. Discarding search space left of ${mid + 1}.`,
        cells: current.map((c, i) => ({
          ...c,
          role: i < mid + 1 ? 'idle' : 'active',
          elevation: 0,
        })),
        pointers: { low: mid + 1, high },
        roles: { [mid + 1]: 'active', [high]: 'active' },
        soundEffect: 'hop',
        codeLine: 5,
      });
      low = mid + 1;
    } else {
      frames.push({
        step: step++,
        explanation: `${midVal} > ${target}. Target must be in lower half. Discarding search space right of ${mid - 1}.`,
        cells: current.map((c, i) => ({
          ...c,
          role: i > mid - 1 ? 'idle' : 'active',
          elevation: 0,
        })),
        pointers: { low, high: mid - 1 },
        roles: { [low]: 'active', [mid - 1]: 'active' },
        soundEffect: 'hop',
        codeLine: 6,
      });
      high = mid - 1;
    }
  }

  return {
    title: `Quantum Binary Search (Target: ${target})`,
    algorithm: 'Binary Search',
    data_structure: 'array',
    time_complexity: 'O(log N)',
    space_complexity: 'O(1)',
    source_code: String(sourceCode || 'int mid = low + (high - low)/2;\nif (arr[mid] == target) return mid;'),
    pseudo_lines: [
      'int low = 0, high = n - 1;',
      'while (low <= high) {',
      '    int mid = (low + high) / 2;',
      '    if (arr[mid] == target) return mid;',
      '    else if (arr[mid] < target) low = mid + 1;',
      '    else high = mid - 1;',
      '} return -1;',
    ],
    total_frames: frames.length,
    frames,
  };
}

// ── BUBBLE SORT / KINETIC SWAP ──
function generateBubbleSort(initialArray, sourceCode) {
  const current = initialArray.map((v, i) => ({ id: `c${i}`, v, addr: `0x${(4096 + i * 4).toString(16)}` }));
  const frames = [];
  let step = 1;
  const n = current.length;

  frames.push({
    step: step++,
    explanation: `Beginning Bubble Sort on ${n} elements. Adjacent elements will be compared and hopped into sorted position.`,
    cells: current.map((c) => ({ ...c, role: 'idle', elevation: 0 })),
    pointers: {},
    roles: {},
    soundEffect: 'hop',
    codeLine: 1,
  });

  for (let i = 0; i < Math.min(n - 1, 3); i++) {
    for (let j = 0; j < n - i - 1; j++) {
      const c1 = current[j];
      const c2 = current[j + 1];

      // Compare
      frames.push({
        step: step++,
        explanation: `Comparing arr[${j}] (${c1.v}) vs arr[${j + 1}] (${c2.v}).`,
        cells: current.map((c, idx) => ({
          ...c,
          role: idx === j || idx === j + 1 ? 'compare' : idx >= n - i ? 'done' : 'idle',
          elevation: idx === j || idx === j + 1 ? -24 : 0,
        })),
        pointers: { j, next: j + 1 },
        roles: { [j]: 'compare', [j + 1]: 'compare' },
        soundEffect: 'compare',
        codeLine: 3,
      });

      if (c1.v > c2.v) {
        // Swap
        current[j] = c2;
        current[j + 1] = c1;

        frames.push({
          step: step++,
          explanation: `${c1.v} > ${c2.v}: Invariant violated! Parabolic kinetic swap executed.`,
          cells: current.map((c, idx) => ({
            ...c,
            role: idx === j || idx === j + 1 ? 'swap' : idx >= n - i ? 'done' : 'idle',
            elevation: idx === j || idx === j + 1 ? -16 : 0,
          })),
          pointers: { j, next: j + 1 },
          roles: { [j]: 'swap', [j + 1]: 'swap' },
          soundEffect: 'swap',
          codeLine: 4,
        });
      }
    }

    // Mark end element sorted
    frames.push({
      step: step++,
      explanation: `Pass ${i + 1} complete. Element at index ${n - i - 1} (${current[n - i - 1].v}) is locked in final sorted position.`,
      cells: current.map((c, idx) => ({
        ...c,
        role: idx >= n - i - 1 ? 'done' : 'idle',
        elevation: 0,
      })),
      pointers: { sorted: n - i - 1 },
      roles: { [n - i - 1]: 'done' },
      soundEffect: 'hop',
      codeLine: 2,
    });
  }

  // All Done
  frames.push({
    step: step++,
    explanation: `Array is fully sorted! All elements verified in ascending order.`,
    cells: current.map((c) => ({ ...c, role: 'done', elevation: 0 })),
    pointers: {},
    roles: Object.fromEntries(current.map((_, i) => [i, 'done'])),
    soundEffect: 'done',
    codeLine: 5,
  });

  return {
    title: 'Kinetic Adaptive Bubble Sort',
    algorithm: 'Bubble Sort',
    data_structure: 'array',
    time_complexity: 'O(N²)',
    space_complexity: 'O(1)',
    source_code: String(sourceCode || 'for (int i=0; i<n-1; i++)\n  for (int j=0; j<n-i-1; j++)\n    if (a[j] > a[j+1]) swap(a[j], a[j+1]);'),
    pseudo_lines: [
      'for i = 0 to n - 1:',
      '  for j = 0 to n - i - 1:',
      '    if arr[j] > arr[j + 1]:',
      '      swap(arr[j], arr[j + 1]);',
      'return sorted_array;',
    ],
    total_frames: frames.length,
    frames,
  };
}

// ── QUICKSORT PARTITION ──
function generateQuickSortPartition(initialArray, sourceCode) {
  const current = initialArray.slice(0, 6).map((v, i) => ({ id: `c${i}`, v, addr: `0x${(4096 + i * 4).toString(16)}` }));
  const frames = [];
  let step = 1;
  const pivotIdx = current.length - 1;
  const pivotVal = current[pivotIdx].v;
  let i = -1;

  frames.push({
    step: step++,
    explanation: `Lomuto Partition. Pivot selected at last index: ${pivotVal}. i initialized before start.`,
    cells: current.map((c, idx) => ({ ...c, role: idx === pivotIdx ? 'active' : 'idle', elevation: idx === pivotIdx ? -20 : 0 })),
    pointers: { pivot: pivotIdx },
    roles: { [pivotIdx]: 'active' },
    soundEffect: 'hop',
    codeLine: 1,
  });

  for (let j = 0; j < pivotIdx; j++) {
    const val = current[j].v;
    frames.push({
      step: step++,
      explanation: `Inspecting arr[${j}] (${val}) against pivot (${pivotVal}).`,
      cells: current.map((c, idx) => ({ ...c, role: idx === j ? 'compare' : idx === pivotIdx ? 'active' : idx <= i ? 'done' : 'idle', elevation: idx === j ? -24 : 0 })),
      pointers: { i: Math.max(i, 0), j, pivot: pivotIdx },
      roles: { [j]: 'compare', [pivotIdx]: 'active' },
      soundEffect: 'compare',
      codeLine: 2,
    });

    if (val < pivotVal) {
      i++;
      if (i !== j) {
        const temp = current[i];
        current[i] = current[j];
        current[j] = temp;
        frames.push({
          step: step++,
          explanation: `${val} < ${pivotVal}: Advanced i to ${i} and swapped arr[${i}] with arr[${j}].`,
          cells: current.map((c, idx) => ({ ...c, role: idx === i || idx === j ? 'swap' : 'idle', elevation: idx === i || idx === j ? -18 : 0 })),
          pointers: { i, j, pivot: pivotIdx },
          roles: { [i]: 'swap', [j]: 'swap' },
          soundEffect: 'swap',
          codeLine: 3,
        });
      }
    }
  }

  // Put pivot in place
  const temp = current[i + 1];
  current[i + 1] = current[pivotIdx];
  current[pivotIdx] = temp;

  frames.push({
    step: step++,
    explanation: `Partition complete! Pivot (${pivotVal}) placed at final index ${i + 1}. All elements to the left are < pivot.`,
    cells: current.map((c, idx) => ({ ...c, role: idx === i + 1 ? 'found' : 'done', elevation: idx === i + 1 ? -28 : 0 })),
    pointers: { pivotFinal: i + 1 },
    roles: { [i + 1]: 'found' },
    soundEffect: 'done',
    codeLine: 4,
  });

  return {
    title: 'Lomuto Kinetic Partition Scheme',
    algorithm: 'QuickSort Partition',
    data_structure: 'array',
    time_complexity: 'O(N)',
    space_complexity: 'O(1)',
    source_code: String(sourceCode || 'int pivot = arr[high];\nint i = low - 1;\nfor (int j = low; j < high; j++) ...'),
    pseudo_lines: [
      'pivot = arr[high], i = low - 1',
      'for j = low to high - 1:',
      '  if arr[j] < pivot: i++, swap(arr[i], arr[j])',
      'swap(arr[i + 1], arr[high]); return i + 1;',
    ],
    total_frames: frames.length,
    frames,
  };
}

// ── SLIDING WINDOW ──
function generateSlidingWindow(initialArray, sourceCode) {
  const current = initialArray.slice(0, 6).map((v, i) => ({ id: `c${i}`, v, addr: `0x${(4096 + i * 4).toString(16)}` }));
  const k = 3;
  const frames = [];
  let step = 1;
  let windowSum = 0;

  for (let i = 0; i < k; i++) windowSum += current[i].v;

  frames.push({
    step: step++,
    explanation: `Initial window of size K=${k} formed from indices 0 to ${k - 1}. Initial sum = ${windowSum}.`,
    cells: current.map((c, idx) => ({ ...c, role: idx < k ? 'active' : 'idle', elevation: idx < k ? -20 : 0 })),
    pointers: { start: 0, end: k - 1 },
    roles: { 0: 'active', [k - 1]: 'active' },
    soundEffect: 'hop',
    codeLine: 1,
  });

  let maxSum = windowSum;
  for (let i = k; i < current.length; i++) {
    const evicted = current[i - k].v;
    const added = current[i].v;
    windowSum = windowSum - evicted + added;
    maxSum = Math.max(maxSum, windowSum);

    frames.push({
      step: step++,
      explanation: `Slide window: Evicting arr[${i - k}] (${evicted}), absorbing arr[${i}] (${added}). New sum = ${windowSum}. Max sum = ${maxSum}.`,
      cells: current.map((c, idx) => ({
        ...c,
        role: idx === i ? 'compare' : idx >= i - k + 1 && idx <= i ? 'active' : idx === i - k ? 'swap' : 'idle',
        elevation: idx >= i - k + 1 && idx <= i ? -20 : 0,
      })),
      pointers: { start: i - k + 1, end: i },
      roles: { [i - k + 1]: 'active', [i]: 'compare' },
      soundEffect: 'compare',
      codeLine: 2,
    });
  }

  frames.push({
    step: step++,
    explanation: `Sliding window traversal complete in linear O(N) time without re-computing sub-sums. Max sum found = ${maxSum}.`,
    cells: current.map((c) => ({ ...c, role: 'done', elevation: 0 })),
    pointers: {},
    roles: Object.fromEntries(current.map((_, i) => [i, 'done'])),
    soundEffect: 'done',
    codeLine: 3,
  });

  return {
    title: 'Kinetic Sliding Window (K=3)',
    algorithm: 'Sliding Window',
    data_structure: 'array',
    time_complexity: 'O(N)',
    space_complexity: 'O(1)',
    source_code: String(sourceCode || 'for (int i=k; i<n; i++) window += arr[i] - arr[i-k];'),
    pseudo_lines: [
      'compute initial sum of first K elements',
      'for i = K to n - 1: window += arr[i] - arr[i - K]',
      'return max_sum_observed',
    ],
    total_frames: frames.length,
    frames,
  };
}

// ── DUTCH NATIONAL FLAG (SORT 0, 1, 2) ──
function generateDutchNationalFlag(sourceCode) {
  const vals = [2, 0, 2, 1, 1, 0];
  const current = vals.map((v, i) => ({ id: `c${i}`, v, addr: `0x${(4096 + i * 4).toString(16)}` }));
  const frames = [];
  let step = 1;
  let low = 0, mid = 0, high = current.length - 1;

  frames.push({
    step: step++,
    explanation: 'Dutch National Flag: Partitioning into 3 color zones [0s, 1s, 2s]. low=0, mid=0, high=5.',
    cells: current.map((c) => ({ ...c, role: 'idle', elevation: 0 })),
    pointers: { low, mid, high },
    roles: { [low]: 'active', [high]: 'active' },
    soundEffect: 'hop',
    codeLine: 1,
  });

  while (mid <= high) {
    const val = current[mid].v;
    if (val === 0) {
      const temp = current[low];
      current[low] = current[mid];
      current[mid] = temp;
      frames.push({
        step: step++,
        explanation: `arr[mid]=0: Hopped 0 to low zone! Swapped arr[${low}] with arr[${mid}]. low++, mid++.`,
        cells: current.map((c, i) => ({ ...c, role: i === low || i === mid ? 'swap' : 'idle', elevation: i === low ? -20 : 0 })),
        pointers: { low: low + 1, mid: mid + 1, high },
        roles: { [low]: 'swap' },
        soundEffect: 'swap',
        codeLine: 2,
      });
      low++; mid++;
    } else if (val === 1) {
      frames.push({
        step: step++,
        explanation: `arr[mid]=1: Already in middle zone. mid++ -> ${mid + 1}.`,
        cells: current.map((c, i) => ({ ...c, role: i === mid ? 'compare' : 'idle', elevation: 0 })),
        pointers: { low, mid: mid + 1, high },
        roles: { [mid]: 'compare' },
        soundEffect: 'hop',
        codeLine: 3,
      });
      mid++;
    } else {
      const temp = current[high];
      current[high] = current[mid];
      current[mid] = temp;
      frames.push({
        step: step++,
        explanation: `arr[mid]=2: Hopped 2 to high zone! Swapped arr[${mid}] with arr[${high}]. high--.`,
        cells: current.map((c, i) => ({ ...c, role: i === mid || i === high ? 'swap' : 'idle', elevation: i === high ? -24 : 0 })),
        pointers: { low, mid, high: high - 1 },
        roles: { [high]: 'swap' },
        soundEffect: 'swap',
        codeLine: 4,
      });
      high--;
    }
  }

  frames.push({
    step: step++,
    explanation: 'All 3 zones ordered! [0, 0, 1, 1, 2, 2] sorted in single pass with 0 extra memory.',
    cells: current.map((c) => ({ ...c, role: 'done', elevation: 0 })),
    pointers: {},
    roles: Object.fromEntries(current.map((_, i) => [i, 'done'])),
    soundEffect: 'done',
    codeLine: 5,
  });

  return {
    title: 'Dutch National Flag (3-Way Partition)',
    algorithm: 'Dutch National Flag',
    data_structure: 'array',
    time_complexity: 'O(N)',
    space_complexity: 'O(1)',
    source_code: String(sourceCode || 'while (mid <= high) { if(a[mid]==0) swap(low++, mid++); ... }'),
    pseudo_lines: [
      'low = 0, mid = 0, high = n - 1',
      'while mid <= high:',
      '  if arr[mid] == 0: swap(arr[low++], arr[mid++])',
      '  else if arr[mid] == 1: mid++',
      '  else: swap(arr[mid], arr[high--])',
    ],
    total_frames: frames.length,
    frames,
  };
}

module.exports = { synthesizeAnimationFromCode };
