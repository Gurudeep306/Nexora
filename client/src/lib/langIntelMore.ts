/*
 * The editor reference for the rest of the judge's languages (langIntel.ts
 * holds C++, C, Python, Java, JavaScript, Go, Rust, Kotlin and C#). Same
 * format: "name|signature|what it does", one per line. Curated for problem
 * solving: reading input, printing, collections, sorting and maths.
 */
import type { LangIntel } from './langIntel'

export const parseRows = (rows: string) =>
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

const lang = (keywords: string, globals: string, members: string): LangIntel => ({
  keywords: words(keywords),
  globals: parseRows(globals),
  members: parseRows(members),
})

export const MORE_INTEL: Record<string, LangIntel> = {
  ruby: lang(
    'begin break case class def do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true unless until when while yield',
    `
    puts|puts(x)|Prints x and a newline.
    print|print(x)|Prints x with no newline.
    p|p(x)|Prints x the way Ruby writes it (handy for debugging).
    gets|gets|Reads one line (with its newline), or nil at the end.
    STDIN.read|STDIN.read|Reads all of the input at once.
    Array.new|Array.new(n, value)|An array of n copies of value.
    Hash.new|Hash.new(default)|A hash that returns default for missing keys.
    Integer|Integer(s)|Converts a string to an integer (fails on bad input).
    rand|rand(n)|A random integer in 0...n.
    `,
    `
    split|split(sep = ' ')|Splits a string into an array.
    map|map { |x| … }|A new array with each element transformed.
    to_i|to_i|String to integer.
    to_s|to_s|To a string.
    chomp|chomp|Drops the trailing newline.
    strip|strip|Drops spaces at both ends.
    sort|sort|A sorted copy.
    sort_by|sort_by { |x| key }|Sorts by a key.
    sum|sum|Adds the elements.
    each|each { |x| … }|Runs the block for every element.
    each_with_index|each_with_index { |x, i| … }|Loops with the index.
    select|select { |x| cond }|Keeps elements where cond is true.
    reduce|reduce(init) { |acc, x| … }|Folds the array into one value.
    include?|include?(x)|True if x is present.
    push|push(x)|Appends to an array.
    pop|pop|Removes and returns the last element.
    size|size|Number of elements.
    join|join(sep)|Joins elements into a string.
    max|max|The largest element.
    min|min|The smallest element.
    uniq|uniq|Removes duplicates.
    `,
  ),
  php: lang(
    'abstract array as break case catch class const continue declare default do echo else elseif empty extends final for foreach function global if implements include isset list namespace new print private protected public require return static switch throw try unset use var while',
    `
    fgets|fgets(STDIN)|Reads one line from input.
    fscanf|fscanf(STDIN, "%d")|Reads formatted values; returns an array.
    trim|trim($s)|Removes spaces and newlines at both ends.
    explode|explode(' ', $s)|Splits a string into an array.
    implode|implode(' ', $arr)|Joins an array into a string.
    intval|intval($s)|String to integer.
    array_map|array_map('intval', $arr)|Applies a function to every element.
    array_sum|array_sum($arr)|Adds the elements.
    count|count($arr)|Number of elements.
    sort|sort($arr)|Sorts in place, ascending.
    rsort|rsort($arr)|Sorts in place, descending.
    usort|usort($arr, fn($a, $b) => $a <=> $b)|Sorts with your comparison.
    max|max($a, $b)|The larger value (or the largest in an array).
    min|min($a, $b)|The smaller value.
    array_push|array_push($arr, $x)|Appends to an array.
    in_array|in_array($x, $arr)|True if $x is in the array.
    str_repeat|str_repeat($s, $n)|$s repeated $n times.
    printf|printf("%d\\n", $x)|Prints formatted text.
    `,
    '',
  ),
  swift: lang(
    'break case class continue default defer do else enum extension false for func guard if import in init inout let nil protocol return self struct switch true var where while',
    `
    readLine|readLine()|Reads one line, or nil at the end of input.
    print|print(items, separator: " ", terminator: "\\n")|Prints values.
    Int|Int(s)!|String to Int (nil if it is not a number).
    Array|Array(repeating: 0, count: n)|An array of n copies.
    max|max(a, b)|The larger value.
    min|min(a, b)|The smaller value.
    abs|abs(x)|Absolute value.
    stride|stride(from: a, to: b, by: step)|Steps from a up to (not including) b.
    swap|swap(&a, &b)|Exchanges two variables.
    `,
    `
    split|split(separator: " ")|Splits a string.
    map|map { … }|Transforms every element.
    sorted|sorted()|A sorted copy (sorted(by: >) for descending).
    sort|sort()|Sorts in place.
    reduce|reduce(0, +)|Folds the elements into one value.
    filter|filter { … }|Keeps elements where the closure is true.
    append|append(x)|Adds to the end.
    count|count|Number of elements.
    contains|contains(x)|True if x is present.
    reversed|reversed()|The elements backwards.
    joined|joined(separator: " ")|Joins strings.
    `,
  ),
  scala: lang(
    'abstract case catch class def do else extends false final for if implicit import lazy match new null object override package private protected return sealed super this throw trait true try type val var while with yield',
    `
    println|println(x)|Prints with a newline.
    scala.io.StdIn.readLine|scala.io.StdIn.readLine()|Reads one line.
    scala.io.StdIn.readInt|scala.io.StdIn.readInt()|Reads a line holding one Int.
    Array.fill|Array.fill(n)(value)|An array of n values.
    math.max|math.max(a, b)|The larger value.
    math.min|math.min(a, b)|The smaller value.
    `,
    `
    split|split(" ")|Splits a string into an Array.
    map|map(_.toInt)|Transforms every element.
    toInt|toInt|String to Int.
    toLong|toLong|String to Long.
    sorted|sorted|A sorted copy.
    sortBy|sortBy(x => key)|Sorts by a key.
    sum|sum|Adds the elements.
    foldLeft|foldLeft(z)((acc, x) => …)|Folds from the left.
    filter|filter(x => …)|Keeps matching elements.
    mkString|mkString(" ")|Joins into a string.
    length|length|Number of elements.
    `,
  ),
  haskell: lang(
    'case class data deriving do else if import in infix instance let module newtype of then type where',
    `
    getLine|getLine :: IO String|Reads one line.
    getContents|getContents :: IO String|Reads all input (lazily).
    interact|interact :: (String -> String) -> IO ()|Turns all input into all output.
    print|print :: Show a => a -> IO ()|Prints a value and a newline.
    putStrLn|putStrLn :: String -> IO ()|Prints a string and a newline.
    read|read :: Read a => String -> a|Parses a value: read s :: Int.
    words|words :: String -> [String]|Splits on whitespace.
    lines|lines :: String -> [String]|Splits into lines.
    unwords|unwords :: [String] -> String|Joins with spaces.
    map|map :: (a -> b) -> [a] -> [b]|Applies a function to every element.
    filter|filter :: (a -> Bool) -> [a] -> [a]|Keeps matching elements.
    foldl'|foldl' :: (b -> a -> b) -> b -> [a] -> b|Strict left fold (from Data.List).
    sum|sum :: Num a => [a] -> a|Adds the elements.
    sort|sort :: Ord a => [a] -> [a]|Sorts (from Data.List).
    replicateM|replicateM :: Int -> m a -> m [a]|Repeats an action n times (Control.Monad).
    `,
    '',
  ),
  lua: lang(
    'and break do else elseif end false for function goto if in local nil not or repeat return then true until while',
    `
    io.read|io.read("n")|Reads a number ("n"), a line ("l") or everything ("a").
    io.write|io.write(...)|Writes values with no newline.
    print|print(...)|Prints values separated by tabs, then a newline.
    tonumber|tonumber(s)|String to number.
    tostring|tostring(x)|Value to string.
    table.insert|table.insert(t, x)|Appends x to the list t.
    table.remove|table.remove(t)|Removes and returns the last element.
    table.sort|table.sort(t[, comp])|Sorts t in place.
    table.concat|table.concat(t, sep)|Joins a list of strings.
    math.max|math.max(a, b, ...)|The largest value.
    math.min|math.min(a, b, ...)|The smallest value.
    math.floor|math.floor(x)|Rounds down.
    string.format|string.format("%d", x)|Formats text.
    ipairs|ipairs(t)|Loops over a list in order: for i, v in ipairs(t).
    pairs|pairs(t)|Loops over every key of a table.
    `,
    '',
  ),
  perl: lang(
    'my our local sub if elsif else unless while until for foreach last next redo return use package print printf chomp',
    `
    print|print LIST|Prints values (add "\\n" yourself).
    printf|printf FORMAT, LIST|Prints formatted text.
    chomp|chomp(my $line = <STDIN>)|Reads a line and drops its newline.
    split|split ' ', $s|Splits on whitespace.
    join|join ' ', @a|Joins a list into a string.
    sort|sort { $a <=> $b } @a|Sorts numbers ascending.
    reverse|reverse @a|The list backwards.
    scalar|scalar(@a)|Number of elements.
    push|push @a, $x|Appends to an array.
    pop|pop @a|Removes the last element.
    map|map { $_ * 2 } @a|Transforms every element.
    grep|grep { $_ > 0 } @a|Keeps matching elements.
    exists|exists $h{$k}|True if the hash has the key.
    `,
    '',
  ),
  shell: lang(
    'if then else elif fi for while until do done case esac function in return local read echo printf declare export',
    `
    read|read -r a b|Reads one line into variables.
    echo|echo "$x"|Prints a line.
    printf|printf '%d\\n' "$x"|Prints formatted text.
    expr|$(( a + b ))|Integer arithmetic.
    mapfile|mapfile -t arr|Reads all lines into an array.
    sort|sort -n|Sorts lines numerically (a command).
    seq|seq 1 n|Prints 1 to n.
    `,
    '',
  ),
  r: lang(
    'if else repeat while function for in next break TRUE FALSE NULL Inf NaN NA',
    `
    readLines|readLines(file("stdin"))|Reads every input line.
    scan|scan(file("stdin"), what = integer(), quiet = TRUE)|Reads all numbers from input.
    cat|cat(x, "\\n")|Prints values separated by spaces.
    print|print(x)|Prints a value the way R shows it.
    as.integer|as.integer(x)|To integer.
    strsplit|strsplit(s, " ")[[1]]|Splits a string.
    sort|sort(x, decreasing = FALSE)|A sorted copy.
    sum|sum(x)|Adds the elements.
    length|length(x)|Number of elements.
    max|max(x)|The largest value.
    min|min(x)|The smallest value.
    paste|paste(x, collapse = " ")|Joins into a string.
    seq_len|seq_len(n)|1 to n (empty when n is 0).
    `,
    '',
  ),
  dart: lang(
    'abstract as assert async await break case catch class const continue default do dynamic else enum extends false final finally for if import in is late new null return static super switch this throw true try var void while',
    `
    stdin.readLineSync|stdin.readLineSync()|Reads one line (import 'dart:io').
    print|print(x)|Prints with a newline.
    int.parse|int.parse(s)|String to int.
    List.filled|List.filled(n, value)|A list of n copies.
    max|max(a, b)|The larger value (import 'dart:math').
    min|min(a, b)|The smaller value (import 'dart:math').
    `,
    `
    split|split(' ')|Splits a string.
    map|map((x) => …).toList()|Transforms every element.
    trim|trim()|Drops spaces at both ends.
    sort|sort()|Sorts in place.
    reduce|reduce((a, b) => a + b)|Folds into one value.
    add|add(x)|Appends.
    length|length|Number of elements.
    join|join(' ')|Joins into a string.
    `,
  ),
  powershell: lang(
    'begin break catch class continue do else elseif end exit filter finally for foreach function if in param process return switch throw trap try until while',
    `
    Read-Host|Read-Host|Reads one line.
    Write-Output|Write-Output $x|Prints a value.
    [int]|[int]$s|Converts to an integer.
    Sort-Object|$a | Sort-Object|Sorts.
    Measure-Object|$a | Measure-Object -Sum|Sum, count, min and max.
    `,
    `
    Split|Split(' ')|Splits a string.
    Trim|Trim()|Drops spaces at both ends.
    Count|Count|Number of elements.
    `,
  ),
  julia: lang(
    'begin break catch const continue do else elseif end export false finally for function global if import let local macro module quote return struct true try using while',
    `
    readline|readline()|Reads one line.
    parse|parse(Int, s)|String to Int.
    println|println(x)|Prints with a newline.
    split|split(s)|Splits on whitespace.
    sort|sort(v)|A sorted copy (sort! sorts in place).
    sum|sum(v)|Adds the elements.
    maximum|maximum(v)|The largest element.
    minimum|minimum(v)|The smallest element.
    length|length(v)|Number of elements.
    push!|push!(v, x)|Appends.
    zeros|zeros(Int, n)|n zeros.
    join|join(v, " ")|Joins into a string.
    `,
    '',
  ),
  fsharp: lang(
    'abstract and as begin class default do done downcast else end exception false for fun function if in inherit inline interface let match member module mutable namespace new not null of open or override rec return static struct then to true try type upcast use val when while with yield',
    `
    stdin.ReadLine|stdin.ReadLine()|Reads one line.
    printfn|printfn "%d" x|Prints formatted text and a newline.
    int|int s|String to int.
    int64|int64 s|String to int64.
    Array.map|Array.map f arr|Transforms every element.
    Array.sort|Array.sort arr|A sorted copy.
    Array.sum|Array.sum arr|Adds the elements.
    List.map|List.map f xs|Transforms every element.
    String.concat|String.concat " " xs|Joins strings.
    `,
    `
    Split|Split(' ')|Splits a string.
    Trim|Trim()|Drops spaces at both ends.
    Length|Length|Number of elements.
    `,
  ),
  clojure: lang(
    'def defn fn let if when cond loop recur do doseq dotimes for ns require nil true false',
    `
    read-line|(read-line)|Reads one line.
    println|(println x)|Prints with a newline.
    Long/parseLong|(Long/parseLong s)|String to long.
    clojure.string/split|(clojure.string/split s #" ")|Splits a string.
    map|(map f coll)|Transforms every element.
    reduce|(reduce + coll)|Folds into one value.
    sort|(sort coll)|A sorted copy.
    count|(count coll)|Number of elements.
    apply|(apply max coll)|Calls f with the collection as arguments.
    `,
    '',
  ),
  scheme: lang(
    'define lambda let let* letrec if cond else case and or begin do set! quote',
    `
    read|(read)|Reads one value (a number or a word).
    read-line|(read-line)|Reads one line.
    display|(display x)|Prints x.
    newline|(newline)|Prints a newline.
    string->number|(string->number s)|String to number.
    map|(map f lst)|Transforms every element.
    apply|(apply + lst)|Calls f with the list as arguments.
    length|(length lst)|Number of elements.
    `,
    '',
  ),
  objectivec: lang(
    'auto break case char const continue default do double else enum extern float for goto if int long register return short signed sizeof static struct switch typedef union unsigned void volatile while @interface @implementation @end @property @autoreleasepool YES NO nil self',
    `
    scanf|scanf("%d", &n)|Reads formatted input.
    printf|printf("%d\\n", n)|Prints formatted text.
    NSLog|NSLog(@"%@", obj)|Logs to stderr (not to the judged output).
    `,
    '',
  ),
  pascal: lang(
    'and array begin case const div do downto else end for function if in mod not of or procedure program record repeat then to type until uses var while',
    `
    readln|readln(a, b)|Reads values and moves to the next line.
    read|read(a)|Reads a value.
    writeln|writeln(x)|Prints with a newline.
    write|write(x)|Prints with no newline.
    max|max(a, b)|The larger value (uses Math).
    min|min(a, b)|The smaller value (uses Math).
    inc|inc(x)|Adds 1 to x.
    length|length(s)|Length of a string or array.
    `,
    '',
  ),
  elixir: lang(
    'after and catch do else end false fn for if in nil not or rescue true unless when case cond def defmodule defp import require alias',
    `
    IO.gets|IO.gets("")|Reads one line.
    IO.read|IO.read(:stdio, :all)|Reads all input.
    IO.puts|IO.puts(x)|Prints with a newline.
    String.split|String.split(s)|Splits on whitespace.
    String.trim|String.trim(s)|Drops spaces at both ends.
    String.to_integer|String.to_integer(s)|String to integer.
    Enum.map|Enum.map(list, fn x -> … end)|Transforms every element.
    Enum.sum|Enum.sum(list)|Adds the elements.
    Enum.sort|Enum.sort(list)|A sorted copy.
    Enum.reduce|Enum.reduce(list, acc, fn x, acc -> … end)|Folds into one value.
    Enum.join|Enum.join(list, " ")|Joins into a string.
    `,
    '',
  ),
  tcl: lang(
    'proc set if else elseif for foreach while return puts gets expr incr list lindex llength lappend split join',
    `
    gets|gets stdin line|Reads one line into line.
    puts|puts $x|Prints with a newline.
    expr|expr {$a + $b}|Arithmetic.
    split|split $s|Splits on whitespace.
    lsort|lsort -integer $l|Sorts a list.
    `,
    '',
  ),
  ocaml: lang(
    'and as assert begin class constraint do done downto else end exception external false for fun function functor if in include inherit let match method module mutable new object of open or private rec sig struct then to true try type val virtual when while with',
    `
    read_int|read_int ()|Reads a line holding one int.
    read_line|read_line ()|Reads one line.
    Scanf.scanf|Scanf.scanf " %d" (fun x -> x)|Reads formatted input.
    print_int|print_int x|Prints an int.
    print_endline|print_endline s|Prints a string and a newline.
    Printf.printf|Printf.printf "%d\\n" x|Prints formatted text.
    List.map|List.map f l|Transforms every element.
    List.fold_left|List.fold_left f init l|Folds from the left.
    List.sort|List.sort compare l|A sorted copy.
    Array.make|Array.make n v|An array of n copies.
    String.split_on_char|String.split_on_char ' ' s|Splits a string.
    `,
    '',
  ),
  d: lang(
    'abstract alias assert auto bool break case cast catch char class const continue default delegate do double else enum false final float for foreach function if immutable import in int interface long module new null out override private public real ref return scope short static string struct super switch this throw true try uint ulong ushort void while',
    `
    readln|readln()|Reads one line.
    readf|readf(" %d", &x)|Reads formatted input.
    writeln|writeln(x)|Prints with a newline.
    writefln|writefln("%d", x)|Prints formatted text.
    to|to!int(s)|Converts a value (std.conv).
    sort|sort(arr)|Sorts in place (std.algorithm).
    sum|sum(arr)|Adds the elements (std.algorithm).
    `,
    `
    split|split()|Splits on whitespace.
    map|map!(x => …)|Transforms lazily.
    array|array|Turns a range into an array.
    strip|strip()|Drops spaces at both ends.
    length|length|Number of elements.
    `,
  ),
  nim: lang(
    'addr and as asm bind block break case cast concept const continue converter defer discard distinct div do elif else end enum except export finally for from func if import in include interface is isnot iterator let macro method mixin mod nil not notin object of or out proc ptr raise ref return shl shr static template try tuple type using var when while xor yield',
    `
    readLine|readLine(stdin)|Reads one line.
    echo|echo x|Prints with a newline.
    parseInt|parseInt(s)|String to int (strutils).
    split|split(s)|Splits on whitespace (strutils).
    newSeq|newSeq[int](n)|A sequence of n zeros.
    sort|sort(s)|Sorts in place (algorithm).
    sum|sum(s)|Adds the elements (math).
    `,
    `
    map|map(parseInt)|Transforms every element (sequtils).
    add|add(x)|Appends.
    len|len|Number of elements.
    `,
  ),
  zig: lang(
    'align allowzero and anyframe anytype asm async await break catch comptime const continue defer else enum errdefer error export extern fn for if inline noalias nosuspend or orelse packed pub resume return struct suspend switch test threadlocal try union unreachable usingnamespace var volatile while',
    `
    std.io.getStdIn|std.io.getStdIn().reader()|A reader for input.
    std.io.getStdOut|std.io.getStdOut().writer()|A writer for output.
    std.fmt.parseInt|std.fmt.parseInt(i64, s, 10)|String to integer.
    std.mem.tokenizeScalar|std.mem.tokenizeScalar(u8, s, ' ')|Splits on a byte.
    std.mem.sort|std.mem.sort(T, items, {}, std.sort.asc(T))|Sorts in place.
    `,
    `
    print|print("{d}\\n", .{x})|Writes formatted text.
    readUntilDelimiterOrEof|readUntilDelimiterOrEof(&buf, '\\n')|Reads one line.
    `,
  ),
  crystal: lang(
    'abstract alias annotation as begin break case class def do else elsif end ensure enum extend false for fun if in include lib macro module next nil of out private protected require rescue return self struct super then true type typeof unless until when while yield',
    `
    gets|gets|Reads one line, or nil.
    puts|puts x|Prints with a newline.
    read_line|read_line|Reads one line (fails at the end).
    Array.new|Array.new(n, value)|An array of n copies.
    `,
    `
    split|split|Splits on whitespace.
    map|map(&.to_i)|Transforms every element.
    to_i|to_i|String to Int32 (to_i64 for Int64).
    sort|sort|A sorted copy.
    sum|sum|Adds the elements.
    join|join(" ")|Joins into a string.
    `,
  ),
  groovy: lang(
    'abstract as assert boolean break byte case catch char class def default do double else enum extends false final finally float for if implements import in instanceof int interface long new null package private protected public return short static super switch this throw true try void while',
    `
    System.in.newReader|System.in.newReader().readLine()|Reads one line.
    println|println x|Prints with a newline.
    `,
    `
    split|split(' ')|Splits a string.
    toInteger|toInteger()|String to Integer.
    collect|collect { it * 2 }|Transforms every element.
    sort|sort()|Sorts (in place for lists).
    sum|sum()|Adds the elements.
    join|join(' ')|Joins into a string.
    `,
  ),
  commonlisp: lang(
    'defun defvar defparameter let let* lambda if when unless cond loop do dolist dotimes setf progn return nil t',
    `
    read|(read)|Reads one value (a number or a symbol).
    read-line|(read-line)|Reads one line.
    format|(format t "~a~%" x)|Prints formatted text (~% is a newline).
    print|(print x)|Prints a value.
    parse-integer|(parse-integer s)|String to integer.
    sort|(sort seq #'<)|Sorts (may change seq).
    reduce|(reduce #'+ seq)|Folds into one value.
    length|(length seq)|Number of elements.
    `,
    '',
  ),
}
