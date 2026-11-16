/*
 * What the editor knows about each language, for suggestions as you type and
 * parameter hints: keywords, the standard-library functions people use in
 * problems (with their signature and one line on what they do), and the
 * methods offered after a ".".
 *
 * Honest scope: this is a curated reference, not a language server. Monaco
 * gives full type-aware IntelliSense only for JavaScript and TypeScript;
 * running language servers for every judge language is not possible on the
 * free host. Each entry is "name|signature|what it does".
 */

export interface IntelEntry {
  name: string
  signature: string
  doc: string
}

export interface LangIntel {
  keywords: string[]
  /** Free functions, types and modules. */
  globals: IntelEntry[]
  /** Offered after "." (and "->" / "::" in C++). */
  members: IntelEntry[]
}

const parse = (rows: string): IntelEntry[] =>
  rows
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, signature, doc] = l.split('|')
      return { name: name.trim(), signature: (signature ?? name).trim(), doc: (doc ?? '').trim() }
    })

const words = (s: string) => s.trim().split(/\s+/)

const CPP: LangIntel = {
  keywords: words(`alignas alignof auto bool break case catch char class const constexpr continue decltype default delete do double else enum explicit extern false float for friend goto if inline int long mutable namespace new noexcept nullptr operator private protected public register return short signed sizeof static static_cast struct switch template this throw true try typedef typename union unsigned using virtual void volatile while include define pragma`),
  globals: parse(`
    sort|sort(first, last[, comp])|Sorts [first, last) in O(n log n).
    stable_sort|stable_sort(first, last[, comp])|Sorts keeping equal elements in their order.
    reverse|reverse(first, last)|Reverses [first, last) in place.
    lower_bound|lower_bound(first, last, value[, comp])|First position not less than value (sorted range).
    upper_bound|upper_bound(first, last, value[, comp])|First position greater than value (sorted range).
    binary_search|binary_search(first, last, value)|True if value is in the sorted range.
    unique|unique(first, last)|Moves consecutive duplicates to the end; returns the new end.
    next_permutation|next_permutation(first, last)|Next lexicographic permutation; false after the last.
    prev_permutation|prev_permutation(first, last)|Previous lexicographic permutation.
    max_element|max_element(first, last)|Iterator to the largest element.
    min_element|min_element(first, last)|Iterator to the smallest element.
    accumulate|accumulate(first, last, init)|Sum of the range plus init (from <numeric>).
    iota|iota(first, last, value)|Fills with value, value+1, value+2, …
    fill|fill(first, last, value)|Sets every element to value.
    count|count(first, last, value)|How many elements equal value.
    find|find(first, last, value)|Iterator to the first element equal to value, else last.
    swap|swap(a, b)|Exchanges a and b.
    max|max(a, b)|The larger of a and b.
    min|min(a, b)|The smaller of a and b.
    abs|abs(x)|Absolute value.
    gcd|gcd(a, b)|Greatest common divisor (C++17).
    lcm|lcm(a, b)|Least common multiple (C++17).
    pow|pow(base, exp)|base to the power exp (double).
    sqrt|sqrt(x)|Square root (double).
    memset|memset(ptr, value, bytes)|Sets bytes (use 0 or -1 for ints).
    make_pair|make_pair(a, b)|Builds a pair.
    to_string|to_string(x)|Number to string.
    stoi|stoi(s)|String to int.
    stoll|stoll(s)|String to long long.
    getline|getline(cin, s)|Reads a whole line into s.
    vector|vector<T> v(n, value)|Dynamic array.
    pair|pair<A, B>|Two values; .first and .second.
    map|map<K, V>|Ordered map (red-black tree), O(log n).
    unordered_map|unordered_map<K, V>|Hash map, O(1) average.
    set|set<T>|Ordered set of unique values.
    multiset|multiset<T>|Ordered set allowing duplicates.
    unordered_set|unordered_set<T>|Hash set.
    priority_queue|priority_queue<T, vector<T>, greater<T>>|Heap; max-heap by default.
    queue|queue<T>|FIFO queue.
    stack|stack<T>|LIFO stack.
    deque|deque<T>|Double-ended queue.
    bitset|bitset<N> b|Fixed-size bits; count(), set(), test().
    string|string s|Text.
    cin|cin >> x|Reads from standard input.
    cout|cout << x|Writes to standard output.
    endl|endl|Newline and flush (slower than "\\n").
    ios_base::sync_with_stdio|ios_base::sync_with_stdio(false)|Faster cin/cout.
  `),
  members: parse(`
    push_back|push_back(x)|Adds x at the end.
    emplace_back|emplace_back(args…)|Builds an element at the end.
    pop_back|pop_back()|Removes the last element.
    size|size()|Number of elements.
    empty|empty()|True if there are no elements.
    clear|clear()|Removes everything.
    begin|begin()|Iterator to the first element.
    end|end()|Iterator past the last element.
    rbegin|rbegin()|Reverse iterator from the end.
    back|back()|The last element.
    front|front()|The first element.
    insert|insert(x) / insert(pos, x)|Inserts an element.
    erase|erase(x) / erase(it)|Removes an element.
    find|find(x)|Iterator to x, else end().
    count|count(x)|How many times x appears (0/1 in set/map).
    lower_bound|lower_bound(x)|First element not less than x (set/map).
    upper_bound|upper_bound(x)|First element greater than x (set/map).
    resize|resize(n[, value])|Changes the size.
    reserve|reserve(n)|Reserves capacity.
    assign|assign(n, value)|Replaces contents.
    push|push(x)|Adds x (queue/stack/priority_queue).
    pop|pop()|Removes the next element.
    top|top()|Next element (stack/priority_queue).
    first|first|First member of a pair.
    second|second|Second member of a pair.
    substr|substr(pos, len)|Part of a string.
    length|length()|Length of a string.
    c_str|c_str()|C-style string.
    append|append(s)|Appends to a string.
  `),
}

const C: LangIntel = {
  keywords: words(`auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while include define`),
  globals: parse(`
    printf|printf(format, …)|Formatted output (%d %lld %s %c %f).
    scanf|scanf(format, &x, …)|Formatted input.
    puts|puts(s)|Prints a string and a newline.
    getchar|getchar()|Reads one character.
    putchar|putchar(c)|Writes one character.
    fgets|fgets(buf, size, stdin)|Reads a line.
    malloc|malloc(bytes)|Allocates memory.
    calloc|calloc(n, size)|Allocates zeroed memory.
    realloc|realloc(ptr, bytes)|Resizes an allocation.
    free|free(ptr)|Frees memory.
    qsort|qsort(base, n, size, cmp)|Sorts an array with a comparison function.
    bsearch|bsearch(key, base, n, size, cmp)|Binary search in a sorted array.
    abs|abs(x)|Absolute value (int).
    llabs|llabs(x)|Absolute value (long long).
    memset|memset(ptr, value, bytes)|Sets bytes.
    memcpy|memcpy(dst, src, bytes)|Copies bytes.
    strlen|strlen(s)|Length of a string.
    strcmp|strcmp(a, b)|Compares strings (0 if equal).
    strcpy|strcpy(dst, src)|Copies a string.
    strcat|strcat(dst, src)|Appends a string.
    sqrt|sqrt(x)|Square root (math.h, link -lm).
    pow|pow(base, exp)|Power (math.h).
    fabs|fabs(x)|Absolute value (double).
  `),
  members: [],
}

const PY: LangIntel = {
  keywords: words(`False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield`),
  globals: parse(`
    print|print(*values, sep=' ', end='\\n')|Writes values to standard output.
    input|input()|Reads one line (without the newline).
    int|int(x)|Converts to an integer.
    float|float(x)|Converts to a float.
    str|str(x)|Converts to a string.
    list|list(iterable)|Makes a list.
    dict|dict()|Makes a dictionary.
    set|set(iterable)|Makes a set.
    tuple|tuple(iterable)|Makes a tuple.
    len|len(x)|Number of items.
    range|range(start, stop[, step])|Integers from start up to stop-1.
    enumerate|enumerate(iterable, start=0)|Pairs (index, value).
    zip|zip(*iterables)|Walks several iterables together.
    map|map(func, iterable)|Applies func to every item.
    filter|filter(func, iterable)|Keeps items where func is true.
    sorted|sorted(iterable, key=None, reverse=False)|A new sorted list.
    reversed|reversed(seq)|Iterates backwards.
    sum|sum(iterable, start=0)|Adds the items.
    min|min(iterable, key=None)|The smallest item.
    max|max(iterable, key=None)|The largest item.
    abs|abs(x)|Absolute value.
    pow|pow(base, exp, mod=None)|Power; with mod it is fast modular power.
    divmod|divmod(a, b)|(a // b, a % b).
    any|any(iterable)|True if any item is true.
    all|all(iterable)|True if every item is true.
    ord|ord(c)|Character to its code point.
    chr|chr(i)|Code point to character.
    bin|bin(x)|Binary string, e.g. '0b101'.
    sys.stdin.readline|sys.stdin.readline()|Fast line input (import sys).
    sys.setrecursionlimit|sys.setrecursionlimit(n)|Allows deeper recursion.
    collections.deque|deque(iterable=())|Fast queue at both ends.
    collections.Counter|Counter(iterable)|Counts items.
    collections.defaultdict|defaultdict(factory)|Dict with a default value.
    heapq.heappush|heappush(heap, item)|Pushes onto a min-heap.
    heapq.heappop|heappop(heap)|Pops the smallest item.
    heapq.heapify|heapify(list)|Turns a list into a heap in O(n).
    bisect.bisect_left|bisect_left(a, x)|First index where x could go (sorted a).
    bisect.bisect_right|bisect_right(a, x)|Last index where x could go.
    math.gcd|gcd(a, b)|Greatest common divisor.
    math.isqrt|isqrt(n)|Integer square root.
    math.inf|inf|Infinity.
    itertools.permutations|permutations(iterable, r=None)|All orderings.
    itertools.combinations|combinations(iterable, r)|All r-subsets.
    functools.lru_cache|@lru_cache(maxsize=None)|Memoises a function.
  `),
  members: parse(`
    append|append(x)|Adds x at the end of a list.
    extend|extend(iterable)|Adds every item.
    pop|pop([i])|Removes and returns an item (last by default).
    insert|insert(i, x)|Inserts x at index i.
    remove|remove(x)|Removes the first x.
    sort|sort(key=None, reverse=False)|Sorts the list in place.
    reverse|reverse()|Reverses in place.
    index|index(x)|Index of the first x.
    count|count(x)|How many times x appears.
    copy|copy()|A shallow copy.
    split|split(sep=None)|Splits a string into a list.
    strip|strip()|Removes surrounding whitespace.
    join|join(iterable)|Joins strings with this one between.
    replace|replace(old, new)|Replaces text.
    startswith|startswith(prefix)|True if the string starts with prefix.
    endswith|endswith(suffix)|True if it ends with suffix.
    find|find(sub)|Index of sub, or -1.
    upper|upper()|Upper-case copy.
    lower|lower()|Lower-case copy.
    isdigit|isdigit()|True if all characters are digits.
    get|get(key, default=None)|Value for key, or default.
    items|items()|(key, value) pairs.
    keys|keys()|The keys.
    values|values()|The values.
    setdefault|setdefault(key, default)|Value for key, inserting default if missing.
    add|add(x)|Adds to a set.
    discard|discard(x)|Removes from a set if present.
    appendleft|appendleft(x)|Adds at the front of a deque.
    popleft|popleft()|Removes from the front of a deque.
    most_common|most_common(n)|The n most common items (Counter).
  `),
}

const JAVA: LangIntel = {
  keywords: words(`abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while var record`),
  globals: parse(`
    System.out.println|System.out.println(x)|Prints x and a newline.
    System.out.print|System.out.print(x)|Prints x.
    Scanner|new Scanner(System.in)|Reads tokens from input (slow for big input).
    BufferedReader|new BufferedReader(new InputStreamReader(System.in))|Fast line input.
    PrintWriter|new PrintWriter(System.out)|Fast output; flush() at the end.
    Integer.parseInt|Integer.parseInt(s)|String to int.
    Long.parseLong|Long.parseLong(s)|String to long.
    Math.max|Math.max(a, b)|The larger value.
    Math.min|Math.min(a, b)|The smaller value.
    Math.abs|Math.abs(x)|Absolute value.
    Math.pow|Math.pow(a, b)|Power (double).
    Math.sqrt|Math.sqrt(x)|Square root.
    Arrays.sort|Arrays.sort(a)|Sorts an array.
    Arrays.fill|Arrays.fill(a, value)|Fills an array.
    Arrays.asList|Arrays.asList(…)|Array to a fixed-size list.
    Collections.sort|Collections.sort(list)|Sorts a list.
    Collections.reverse|Collections.reverse(list)|Reverses a list.
    ArrayList|new ArrayList<>()|Resizable list.
    HashMap|new HashMap<>()|Hash map.
    TreeMap|new TreeMap<>()|Sorted map.
    HashSet|new HashSet<>()|Hash set.
    TreeSet|new TreeSet<>()|Sorted set.
    ArrayDeque|new ArrayDeque<>()|Fast stack/queue.
    PriorityQueue|new PriorityQueue<>()|Min-heap.
    StringBuilder|new StringBuilder()|Builds strings fast.
  `),
  members: parse(`
    add|add(x)|Adds an element.
    get|get(i) / get(key)|Element at index, or value for key.
    set|set(i, x)|Replaces the element at i.
    size|size()|Number of elements.
    isEmpty|isEmpty()|True if empty.
    remove|remove(x)|Removes an element.
    contains|contains(x)|True if present.
    containsKey|containsKey(key)|True if the map has key.
    put|put(key, value)|Stores a value.
    getOrDefault|getOrDefault(key, def)|Value or def.
    merge|merge(key, 1, Integer::sum)|Adds to a count.
    keySet|keySet()|The keys.
    values|values()|The values.
    entrySet|entrySet()|Key-value entries.
    poll|poll()|Removes and returns the head (null if empty).
    peek|peek()|The head without removing it.
    offer|offer(x)|Adds to a queue.
    push|push(x)|Pushes onto a deque/stack.
    pop|pop()|Pops from a deque/stack.
    append|append(x)|Appends to a StringBuilder.
    toString|toString()|As a string.
    length|length()|Length of a string.
    charAt|charAt(i)|Character at i.
    substring|substring(begin, end)|Part of a string.
    split|split(regex)|Splits a string.
    equals|equals(other)|Compares objects (use for strings).
    nextInt|nextInt()|Next int (Scanner).
    nextLong|nextLong()|Next long (Scanner).
    nextLine|nextLine()|Next line (Scanner).
    readLine|readLine()|Next line (BufferedReader).
    floorKey|floorKey(x)|Largest key ≤ x (TreeMap).
    ceilingKey|ceilingKey(x)|Smallest key ≥ x (TreeMap).
  `),
}

const JS: LangIntel = {
  keywords: words(`async await break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null of return super switch this throw true try typeof undefined var void while yield`),
  globals: parse(`
    console.log|console.log(...values)|Prints values.
    require|require('fs')|Loads a module.
    parseInt|parseInt(s, 10)|String to integer.
    parseFloat|parseFloat(s)|String to number.
    Number|Number(x)|Converts to a number.
    BigInt|BigInt(x)|Arbitrary-size integer.
    Math.max|Math.max(...xs)|The largest.
    Math.min|Math.min(...xs)|The smallest.
    Math.floor|Math.floor(x)|Rounds down.
    Math.abs|Math.abs(x)|Absolute value.
    Array.from|Array.from({ length: n }, (_, i) => i)|Builds an array.
    Map|new Map()|Key-value map.
    Set|new Set()|Set of unique values.
    JSON.stringify|JSON.stringify(x)|Value to JSON text.
  `),
  members: parse(`
    push|push(x)|Adds at the end.
    pop|pop()|Removes the last.
    shift|shift()|Removes the first (O(n)).
    unshift|unshift(x)|Adds at the front.
    map|map((x, i) => …)|New array of results.
    filter|filter((x) => …)|Keeps matching items.
    reduce|reduce((acc, x) => …, init)|Folds into one value.
    forEach|forEach((x) => …)|Runs for each item.
    sort|sort((a, b) => a - b)|Sorts in place (pass a comparator for numbers).
    slice|slice(start, end)|A copy of part.
    splice|splice(start, count)|Removes/inserts in place.
    indexOf|indexOf(x)|Index or -1.
    includes|includes(x)|True if present.
    join|join(sep)|Joins into a string.
    split|split(sep)|Splits a string.
    trim|trim()|Removes surrounding whitespace.
    length|length|Number of items/characters.
    get|get(key)|Map value.
    set|set(key, value)|Map store.
    has|has(key)|True if present (Map/Set).
    add|add(x)|Adds to a Set.
    delete|delete(key)|Removes from Map/Set.
  `),
}

const GO: LangIntel = {
  keywords: words(`break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var`),
  globals: parse(`
    fmt.Println|fmt.Println(a ...any)|Prints with spaces and a newline.
    fmt.Printf|fmt.Printf(format, a ...any)|Formatted output.
    fmt.Scan|fmt.Scan(&a ...)|Reads values (slow for big input).
    bufio.NewReader|bufio.NewReader(os.Stdin)|Fast input reader.
    bufio.NewWriter|bufio.NewWriter(os.Stdout)|Fast output; Flush() at the end.
    sort.Ints|sort.Ints(a)|Sorts ints.
    sort.Slice|sort.Slice(a, func(i, j int) bool { … })|Sorts with a comparison.
    strconv.Atoi|strconv.Atoi(s)|String to int.
    strconv.Itoa|strconv.Itoa(i)|Int to string.
    strings.Split|strings.Split(s, sep)|Splits a string.
    strings.Fields|strings.Fields(s)|Splits on whitespace.
    make|make([]T, n)|Makes a slice, map or channel.
    append|append(s, x...)|Appends to a slice.
    len|len(x)|Length.
    copy|copy(dst, src)|Copies a slice.
  `),
  members: parse(`
    ReadString|ReadString('\\n')|Reads up to a delimiter.
    Flush|Flush()|Writes buffered output.
  `),
}

const RUST: LangIntel = {
  keywords: words(`as break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while`),
  globals: parse(`
    println!|println!("{}", x)|Prints with a newline.
    print!|print!("{}", x)|Prints.
    vec!|vec![value; n]|Makes a Vec.
    Vec::new|Vec::new()|Empty vector.
    Vec::with_capacity|Vec::with_capacity(n)|Vector with room for n.
    HashMap::new|HashMap::new()|Hash map (use std::collections::HashMap).
    BTreeMap::new|BTreeMap::new()|Sorted map.
    HashSet::new|HashSet::new()|Hash set.
    VecDeque::new|VecDeque::new()|Double-ended queue.
    BinaryHeap::new|BinaryHeap::new()|Max-heap (wrap in Reverse for min).
    String::new|String::new()|Empty string.
    std::io::stdin|stdin().read_line(&mut s)|Reads a line.
  `),
  members: parse(`
    push|push(x)|Adds at the end.
    pop|pop()|Removes the last (Option).
    len|len()|Length.
    is_empty|is_empty()|True if empty.
    iter|iter()|Iterator over references.
    into_iter|into_iter()|Consuming iterator.
    map|map(|x| …)|Transforms items.
    filter|filter(|x| …)|Keeps matching items.
    collect|collect::<Vec<_>>()|Gathers an iterator.
    sum|sum::<i64>()|Adds the items.
    sort|sort()|Sorts in place.
    sort_unstable|sort_unstable()|Faster sort.
    insert|insert(k, v)|Inserts.
    get|get(&k)|Looks up (Option).
    entry|entry(k).or_insert(0)|Get or insert.
    contains_key|contains_key(&k)|True if present.
    unwrap|unwrap()|Takes the value (panics on None/Err).
    trim|trim()|Removes whitespace.
    split_whitespace|split_whitespace()|Splits on whitespace.
    parse|parse::<i64>()|Parses a number.
  `),
}

const KOTLIN: LangIntel = {
  keywords: words(`as break class continue do else false for fun if in interface is null object package return super this throw true try typealias val var when while`),
  globals: parse(`
    println|println(x)|Prints with a newline.
    readLine|readLine()!!|Reads a line.
    readln|readln()|Reads a line (Kotlin 1.6+).
    listOf|listOf(…)|Read-only list.
    mutableListOf|mutableListOf<T>()|Growable list.
    mutableMapOf|mutableMapOf<K, V>()|Growable map.
    IntArray|IntArray(n)|Array of ints.
  `),
  members: parse(`
    split|split(" ")|Splits a string.
    map|map { it.toInt() }|Transforms items.
    toInt|toInt()|To Int.
    toLong|toLong()|To Long.
    sorted|sorted()|A sorted copy.
    sum|sum()|Adds the items.
    add|add(x)|Adds to a list.
    size|size|Number of items.
  `),
}

const CSHARP: LangIntel = {
  keywords: words(`abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile while`),
  globals: parse(`
    Console.WriteLine|Console.WriteLine(x)|Prints with a newline.
    Console.ReadLine|Console.ReadLine()|Reads a line.
    int.Parse|int.Parse(s)|String to int.
    long.Parse|long.Parse(s)|String to long.
    Math.Max|Math.Max(a, b)|The larger.
    Math.Min|Math.Min(a, b)|The smaller.
    List|new List<T>()|Growable list.
    Dictionary|new Dictionary<K, V>()|Hash map.
  `),
  members: parse(`
    Add|Add(x)|Adds an element.
    Count|Count|Number of elements.
    Split|Split(' ')|Splits a string.
    Select|Select(x => …)|Transforms (LINQ).
    ToArray|ToArray()|To an array.
    ContainsKey|ContainsKey(k)|True if present.
  `),
}

const INTEL: Record<string, LangIntel> = {
  cpp: CPP,
  c: C,
  python: PY,
  java: JAVA,
  javascript: JS,
  typescript: JS,
  go: GO,
  rust: RUST,
  kotlin: KOTLIN,
  csharp: CSHARP,
}

/** Keywords for languages without a curated reference (still worth offering). */
const KEYWORDS_ONLY: Record<string, string> = {
  ruby: 'begin break case class def do else elsif end ensure false for if in module next nil not or puts redo rescue retry return self super then true unless until when while yield',
  php: 'abstract array as break case catch class const continue declare default do echo else elseif empty extends final for foreach function global if implements include isset list namespace new print private protected public require return static switch throw try unset use var while',
  swift: 'break case class continue default defer do else enum extension false for func guard if import in init let nil protocol return self struct switch true var where while',
  scala: 'abstract case catch class def do else extends false final for if implicit import lazy match new null object override package private protected return sealed super this throw trait true try type val var while with yield',
  haskell: 'case class data deriving do else if import in infix instance let module newtype of then type where',
  lua: 'and break do else elseif end false for function goto if in local nil not or repeat return then true until while',
}

export function intelFor(lang: string): LangIntel | null {
  if (INTEL[lang]) return INTEL[lang]
  const kw = KEYWORDS_ONLY[lang]
  return kw ? { keywords: words(kw), globals: [], members: [] } : null
}

/** The entry for a call such as "lower_bound(" or "Math.max(" (for parameter hints). */
export function signatureFor(lang: string, callee: string): IntelEntry | null {
  const intel = intelFor(lang)
  if (!intel) return null
  const last = callee.split(/::|\.|->/).pop() ?? callee
  return (
    intel.globals.find((e) => e.name === callee) ??
    intel.globals.find((e) => e.name.split(/::|\./).pop() === last) ??
    intel.members.find((e) => e.name === last) ??
    null
  )
}
