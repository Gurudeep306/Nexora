#!/usr/bin/env node
/**
 * Runs a tiny "read a number, print it doubled" program in every language the
 * app maps to Piston and reports which ones really work on this machine.
 *
 *   node deploy/oracle/piston-smoke.js            → prints the result table
 *   node deploy/oracle/piston-smoke.js --write-env → also sets PISTON_LANGUAGES
 *                                                   in /opt/nexora/.env (or $ENV_FILE)
 *
 * On an ARM (aarch64) VM some Piston packages are x86-only builds and fail
 * with "Exec format error"; leaving them out of PISTON_LANGUAGES makes the app
 * send those languages to Wandbox instead.
 */
const fs = require("fs");
const path = require("path");
const { PISTON_MAP, runPiston } = require("../../src/piston");

const SNIPPETS = {
  cpp: '#include <iostream>\nint main(){long long n;std::cin>>n;std::cout<<n*2<<"\\n";}',
  c: '#include <stdio.h>\nint main(){long long n;scanf("%lld",&n);printf("%lld\\n",n*2);return 0;}',
  python: "print(int(input())*2)",
  java: "import java.util.*;\npublic class Main{public static void main(String[] a){Scanner s=new Scanner(System.in);System.out.println(s.nextLong()*2);}}",
  javascript: "const n=+require('fs').readFileSync(0,'utf8').trim();console.log(n*2)",
  typescript: "const n: number = 21;\nconsole.log(n * 2)",
  csharp: "using System;class P{static void Main(){Console.WriteLine(long.Parse(Console.ReadLine())*2);}}",
  go: 'package main\nimport "fmt"\nfunc main(){var n int64;fmt.Scan(&n);fmt.Println(n*2)}',
  rust: "use std::io::*;fn main(){let mut s=String::new();stdin().read_line(&mut s).unwrap();let n:i64=s.trim().parse().unwrap();println!(\"{}\",n*2);}",
  kotlin: "fun main(){val n=readLine()!!.trim().toLong();println(n*2)}",
  ruby: "puts gets.to_i*2",
  php: "<?php echo intval(trim(fgets(STDIN)))*2, \"\\n\";",
  perl: "my $n=<STDIN>;print $n*2,\"\\n\";",
  lua: "local n=io.read('n');print(math.floor(n*2))",
  shell: "read n; echo $((n*2))",
  r: "n <- as.integer(readLines(file('stdin'), n=1)); cat(n*2, '\\n')",
  scala: "object Main extends App { println(scala.io.StdIn.readLine().trim.toLong * 2) }",
  swift: "let n = Int(readLine()!)!\nprint(n*2)",
  dart: "import 'dart:io';\nvoid main(){final n=int.parse(stdin.readLineSync()!.trim());print(n*2);}",
  powershell: "$n=[int](Read-Host); Write-Output ($n*2)",
  julia: "n=parse(Int,readline());println(n*2)",
  fsharp: "let n = System.Console.ReadLine() |> int64\nprintfn \"%d\" (n*2L)",
  clojure: "(println (* 2 (Long/parseLong (clojure.string/trim (read-line)))))",
  pascal: "var n:int64;begin readln(n);writeln(n*2);end.",
  elixir: "IO.gets(\"\") |> String.trim |> String.to_integer |> Kernel.*(2) |> IO.puts",
  haskell: "main = do { n <- readLn :: IO Integer; print (n*2) }",
  ocaml: "let () = Scanf.scanf \" %d\" (fun n -> print_int (n*2); print_newline ())",
  d: "import std.stdio,std.conv,std.string;void main(){long n=readln.strip.to!long;writeln(n*2);}",
  nim: "import strutils\nlet n=parseInt(readLine(stdin).strip)\necho n*2",
  zig: 'const std = @import("std");\npub fn main() !void { try std.io.getStdOut().writer().print("{d}\\n", .{21*2}); }',
  crystal: "n = gets.not_nil!.strip.to_i64\nputs n*2",
  groovy: "def n = System.in.newReader().readLine().trim() as long\nprintln n*2",
  commonlisp: "(print (* 2 (read)))",
};

async function main() {
  const env = { ...process.env, JUDGE_MODE: "piston", PISTON_LANGUAGES: "" };
  const ok = [];
  const langs = Object.keys(PISTON_MAP);
  for (const lang of langs) {
    const code = SNIPPETS[lang];
    if (!code) continue;
    const r = await runPiston(code, "21\n", lang, { env });
    const pass = !r._pistonFailed && r.verdict === null && /\b42\b/.test(r.stdout);
    if (pass) ok.push(lang);
    const why = pass ? "" : ` — ${(r.stderr || r.stdout || r.verdict || "").split("\n")[0].slice(0, 90)}`;
    console.log(`${pass ? "✓" : "✗"} ${lang.padEnd(11)}${why}`);
  }
  console.log(`\n${ok.length}/${langs.length} languages run on Piston: ${ok.join(",") || "(none)"}`);

  if (process.argv.includes("--write-env")) {
    const file = process.env.ENV_FILE || path.join(__dirname, "..", "..", ".env");
    let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    // Nothing works → turn Piston off rather than route everything to it.
    const line = ok.length ? `PISTON_LANGUAGES=${ok.join(",")}` : "PISTON_LANGUAGES=";
    text = /^PISTON_LANGUAGES=.*$/m.test(text)
      ? text.replace(/^PISTON_LANGUAGES=.*$/m, line)
      : `${text.replace(/\n?$/, "\n")}${line}\n`;
    if (!ok.length) text = text.replace(/^JUDGE_MODE=.*$/m, "JUDGE_MODE=remote");
    fs.writeFileSync(file, text);
    console.log(`wrote ${line}${ok.length ? "" : " and JUDGE_MODE=remote"} to ${file}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
