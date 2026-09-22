/* Starter boilerplate per language — inserted by the editor toolbar and used
   as the default document when a problem has no saved code yet. */
export const TEMPLATES: Record<string, string> = {
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}\n',
  c: '#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n\n    return 0;\n}\n',
  python: 'import sys\ninput = sys.stdin.readline\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n',
  java: 'import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n\n    }\n}\n',
  javascript: 'const input = require("fs").readFileSync(0, "utf8").trim().split(/\\s+/);\n\n',
  typescript: 'import * as fs from "fs";\nconst input = fs.readFileSync(0, "utf8").trim().split(/\\s+/);\n\n',
  go: 'package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\tin := bufio.NewReader(os.Stdin)\n\tout := bufio.NewWriter(os.Stdout)\n\tdefer out.Flush()\n\t_ = in\n\t_ = fmt.Fprintln\n}\n',
  rust: 'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let mut tokens = input.split_whitespace();\n}\n',
  kotlin: 'import java.util.*\n\nfun main() {\n    val sc = Scanner(System.`in`)\n\n}\n',
  csharp: 'using System;\n\nclass MainClass {\n    static void Main() {\n\n    }\n}\n',
  ruby: 'input = STDIN.read.split\n\n',
  php: '<?php\n$input = trim(stream_get_contents(STDIN));\n\n',
  perl: 'while (<STDIN>) {\n    chomp;\n}\n',
  lua: 'local input = io.read("*a")\n\n',
  shell: '#!/usr/bin/env bash\nread -r line\n\n',
  r: 'con <- file("stdin", "r")\nlines <- readLines(con)\n\n',
  scala: 'object Main extends App {\n\n}\n',
  swift: 'import Foundation\n\nwhile let line = readLine() {\n\n}\n',
  dart: "import 'dart:io';\n\nvoid main() {\n  final input = stdin.readLineSync();\n}\n",
  julia: 'line = readline(stdin)\n\n',
  pascal: 'program arena;\nvar\n  n: longint;\nbegin\n  readln(n);\nend.\n',
  elixir: 'input = IO.read(:stdio, :all)\n\n',
  tcl: 'set line [gets stdin]\n\n',
  fsharp: 'let n = stdin.ReadLine() |> int\n\n',
  objectivec: '#import <objc/Object.h>\n#include <stdio.h>\n\nint main(void) {\n\n    return 0;\n}\n',
  haskell: 'main :: IO ()\nmain = do\n    s <- getContents\n    let xs = map read (words s) :: [Int]\n    print (sum xs)\n',
  ocaml: 'let () =\n  let n = Scanf.scanf " %d" (fun x -> x) in\n  Printf.printf "%d\\n" n\n',
  d: 'import std.stdio;\n\nvoid main() {\n    int n;\n    readf(" %d", &n);\n    writeln(n);\n}\n',
  nim: 'import strutils\n\nlet n = stdin.readLine.strip.parseInt\necho n\n',
  zig: 'const std = @import("std");\n\npub fn main() !void {\n    const stdout = std.io.getStdOut().writer();\n    try stdout.print("{s}\\n", .{"hello"});\n}\n',
  crystal: 'input = STDIN.gets_to_end.split\n\n',
  groovy: 'def input = System.in.text.split()\n\n',
  commonlisp: '(let ((n (read)))\n  (format t "~a~%" n))\n',
}

export const DEFAULT_CODE = (lang: string): string => TEMPLATES[lang] ?? ''

export const LANG_EXT: Record<string, string> = {
  cpp: 'cpp', c: 'c', python: 'py', java: 'java', javascript: 'js', typescript: 'ts',
  csharp: 'cs', go: 'go', rust: 'rs', kotlin: 'kt', ruby: 'rb', php: 'php', perl: 'pl',
  lua: 'lua', shell: 'sh', r: 'r', scala: 'scala', swift: 'swift', dart: 'dart',
  powershell: 'ps1', julia: 'jl', fsharp: 'fsx', clojure: 'clj', scheme: 'scm',
  objectivec: 'm', pascal: 'pas', elixir: 'exs', tcl: 'tcl',
  haskell: 'hs', ocaml: 'ml', d: 'd', nim: 'nim', zig: 'zig', crystal: 'cr', groovy: 'groovy', commonlisp: 'lisp',
}
