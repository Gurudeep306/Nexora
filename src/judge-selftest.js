/* Language self-test: runs a tiny "read n numbers, print their sum" program in
   every language through the real judge path and reports what works. */
const INPUT = '3\n4 5 6\n';
const EXPECTED = '15';

const PROGRAMS = {
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){int n;cin>>n;long long s=0;for(int i=0;i<n;i++){long long x;cin>>x;s+=x;}cout<<s<<"\\n";}',
  c: '#include <stdio.h>\nint main(){int n;scanf("%d",&n);long long s=0;for(int i=0;i<n;i++){long long x;scanf("%lld",&x);s+=x;}printf("%lld\\n",s);}',
  python: 'import sys\nd=sys.stdin.read().split()\nprint(sum(map(int,d[1:])))',
  java: 'import java.util.*;\npublic class Main{public static void main(String[] a){Scanner s=new Scanner(System.in);int n=s.nextInt();long t=0;for(int i=0;i<n;i++)t+=s.nextLong();System.out.println(t);}}',
  javascript: 'const d=require("fs").readFileSync(0,"utf8").trim().split(/\\s+/).map(Number);console.log(d.slice(1).reduce((a,b)=>a+b,0))',
  typescript: 'import * as fs from "fs";\nconst d: number[] = fs.readFileSync(0,"utf8").trim().split(/\\s+/).map(Number);\nconsole.log(d.slice(1).reduce((a,b)=>a+b,0))',
  csharp: 'using System;using System.Linq;class M{static void Main(){var d=Console.In.ReadToEnd().Split((char[])null,StringSplitOptions.RemoveEmptyEntries).Select(long.Parse).ToArray();Console.WriteLine(d.Skip(1).Sum());}}',
  go: 'package main\nimport "fmt"\nfunc main(){var n int;fmt.Scan(&n);s:=0;for i:=0;i<n;i++{var x int;fmt.Scan(&x);s+=x};fmt.Println(s)}',
  rust: 'use std::io::*;\nfn main(){let mut s=String::new();stdin().read_to_string(&mut s).unwrap();let v:Vec<i64>=s.split_whitespace().map(|x|x.parse().unwrap()).collect();println!("{}",v[1..].iter().sum::<i64>());}',
  kotlin: 'import java.util.*\n\nfun main(){val sc=Scanner(System.`in`);val n=sc.nextInt();var s=0L;repeat(n){s+=sc.nextLong()};println(s)}',
  ruby: 'd=STDIN.read.split.map(&:to_i)\nputs d[1..].sum',
  php: '<?php\n$d=preg_split("/\\s+/",trim(stream_get_contents(STDIN)));array_shift($d);echo array_sum($d),"\\n";',
  perl: 'my @d=split " ",join("",<STDIN>);shift @d;my $s=0;$s+=$_ for @d;print "$s\\n";',
  lua: 'local n=io.read("n");local s=0;for i=1,n do s=s+io.read("n") end;print(math.tointeger(s) or s)',
  shell: 'read n\nread -a a\ns=0;for x in "${a[@]}";do s=$((s+x));done;echo $s',
  r: 'con<-file("stdin","r");d<-scan(con,quiet=TRUE);cat(sum(d[-1]),"\\n")',
  scala: 'object Main extends App{scala.io.StdIn.readLine();val a=scala.io.StdIn.readLine().trim.split(" ").map(_.toLong);println(a.sum)}',
  swift: 'let _=readLine()!\nlet a=readLine()!.split(separator:" ").map{Int($0)!}\nprint(a.reduce(0,+))',
  dart: "import 'dart:io';\nvoid main(){stdin.readLineSync();final a=stdin.readLineSync()!.trim().split(' ').map(int.parse);print(a.reduce((x,y)=>x+y));}",
  julia: 'n=parse(Int,readline())\na=parse.(Int,split(readline()))\nprintln(sum(a))',
  fsharp: 'let _ = stdin.ReadLine()\nlet a = stdin.ReadLine().Trim().Split(\' \') |> Array.map int64\nprintfn "%d" (Array.sum a)',
  objectivec: '#import <objc/Object.h>\n#include <stdio.h>\nint main(){int n;scanf("%d",&n);long long s=0;for(int i=0;i<n;i++){long long x;scanf("%lld",&x);s+=x;}printf("%lld\\n",s);return 0;}',
  pascal: 'program a;var n,i:longint;x,s:int64;begin readln(n);s:=0;for i:=1 to n do begin read(x);s:=s+x;end;writeln(s);end.',
  haskell: 'main=do{s<-getContents;let{(_:xs)=map read (words s)::[Integer]};print (sum xs)}',
  ocaml: 'let ()=let n=Scanf.scanf " %d" (fun x->x) in let s=ref 0 in for _=1 to n do s:= !s+Scanf.scanf " %d" (fun x->x) done; Printf.printf "%d\\n" !s',
  d: 'import std.stdio,std.algorithm,std.array,std.conv,std.string;void main(){auto d=stdin.byLine.map!(l=>l.idup).join(" ").split.map!(to!long).array;writeln(d[1..$].sum);}',
  nim: 'import strutils,sequtils\ndiscard stdin.readLine\necho stdin.readLine.splitWhitespace.map(parseInt).foldl(a+b)',
  zig: 'const std=@import("std");\npub fn main() !void{const r=std.io.getStdIn().reader();var buf:[4096]u8=undefined;const n=try r.readAll(&buf);var it=std.mem.tokenizeAny(u8,buf[0..n]," \\n\\r");_=it.next();var s:i64=0;while(it.next())|t|{s+=try std.fmt.parseInt(i64,t,10);}try std.io.getStdOut().writer().print("{d}\\n",.{s});}',
  crystal: 'd=STDIN.gets_to_end.split.map(&.to_i64)\nputs d[1..].sum',
  groovy: 'def d=System.in.text.split().collect{it as long}\nprintln d.drop(1).sum()',
  commonlisp: '(let ((n (read))) (format t "~a~%" (loop repeat n sum (read))))',
};

const CONCURRENCY = Number(process.env.SELFTEST_CONCURRENCY) || 8;

async function selfTest({ judge, LANG_CONFIG, hasRemote, REMOTE_ONLY }, only) {
  const langs = Object.keys(LANG_CONFIG).filter((l) => !only || only.includes(l));
  const out = [];
  let next = 0;
  async function worker() {
    while (next < langs.length) {
      const lang = langs[next++];
      const code = PROGRAMS[lang];
      if (REMOTE_ONLY && !hasRemote(lang)) {
        out.push({ lang, ok: false, status: 'unavailable', detail: 'No remote sandbox for this language' });
        continue;
      }
      if (!code) {
        out.push({ lang, ok: false, status: 'untested', detail: 'No self-test program' });
        continue;
      }
      const t0 = Date.now();
      try {
        const r = await judge(code, [{ id: 0, input: INPUT, expected_output: EXPECTED }], lang);
        out.push({
          lang,
          ok: r.verdict === 'AC',
          status: r.verdict,
          ms: Date.now() - t0,
          engine: r.engine || r.results?.[0]?.engine || 'unknown',
          detail: r.verdict === 'AC' ? '' : String(r.compileError || r.results?.[0]?.stderr || r.results?.[0]?.actual || '').slice(0, 600),
        });
      } catch (e) {
        out.push({ lang, ok: false, status: 'error', ms: Date.now() - t0, detail: String(e?.message || e) });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const order = Object.keys(LANG_CONFIG);
  return out.sort((a, b) => order.indexOf(a.lang) - order.indexOf(b.lang));
}

module.exports = { selfTest, PROGRAMS };
