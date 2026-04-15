const { quickRun, judge } = require('./src/judge');

// === PART 1: quickRun speed + correctness test (all 20 languages with stdin) ===
const tests = [
  ['python','a,b=map(int,input().split())\nprint(a+b)','3 5','8'],
  ['javascript','const r=require("readline").createInterface({input:process.stdin});r.on("line",l=>{const[a,b]=l.split(" ").map(Number);console.log(a+b);r.close()})','3 5','8'],
  ['c','#include<stdio.h>\nint main(){int a,b;scanf("%d%d",&a,&b);printf("%d",a+b);}','3 5','8'],
  ['cpp','#include<iostream>\nusing namespace std;int main(){int a,b;cin>>a>>b;cout<<a+b;}','3 5','8'],
  ['java','import java.util.Scanner;public class Main{public static void main(String[] a){Scanner sc=new Scanner(System.in);System.out.println(sc.nextInt()+sc.nextInt());}}','3 5','8'],
  ['ruby','a,b=gets.split.map(&:to_i);puts a+b','3 5','8'],
  ['perl','my $l=<STDIN>;chomp $l;my($a,$b)=split(" ",$l);print $a+$b','3 5','8'],
  ['swift','import Foundation;let parts=readLine()!.split(separator:" ").map{Int($0)!};print(parts[0]+parts[1])','3 5','8'],
  ['go','package main\nimport "fmt"\nfunc main(){var a,b int;fmt.Scan(&a,&b);fmt.Println(a+b)}','3 5','8'],
  ['php','<?php $l=trim(fgets(STDIN));list($a,$b)=explode(" ",$l);echo $a+$b;','3 5','8'],
  ['lua','local a,b=io.read("n","n")\nprint(a+b)','3 5','8'],
  ['r','input=file("stdin","r")\nline=readLines(input,1)\nvals=as.integer(strsplit(line," ")[[1]])\ncat(vals[1]+vals[2])','3 5','8'],
  ['rust','use std::io;fn main(){let mut s=String::new();io::stdin().read_line(&mut s).unwrap();let v:Vec<i64>=s.trim().split_whitespace().map(|x|x.parse().unwrap()).collect();println!("{}",v[0]+v[1])}','3 5','8'],
  ['csharp','using System;class P{static void Main(){var p=Console.ReadLine().Split();Console.WriteLine(int.Parse(p[0])+int.Parse(p[1]));}}','3 5','8'],
  ['scala','object Main{def main(a:Array[String]):Unit={val Array(x,y)=scala.io.StdIn.readLine().split(" ").map(_.toInt);println(x+y)}}','3 5','8'],
  ['julia','a,b=parse.(Int,split(readline()));println(a+b)','3 5','8'],
  ['pascal','program main;var a,b:integer;begin read(a,b);writeln(a+b);end.','3 5','8'],
  ['typescript','const fs=require("fs");const[a,b]=fs.readFileSync("/dev/stdin","utf8").trim().split(" ").map(Number);console.log(a+b)','3 5','8'],
  ['kotlin','fun main(){val(a,b)=readLine()!!.split(" ").map{it.toInt()};println(a+b)}','3 5','8'],
  ['shell','read a b;echo $((a+b))','3 5','8'],
];

// === PART 2: judge() auto-check test (multiple test cases per language) ===
const tc3 = [
  { id: 1, label: 'Test 1', input: '3 5', expected_output: '8' },
  { id: 2, label: 'Test 2', input: '10 20', expected_output: '30' },
  { id: 3, label: 'Test 3', input: '0 0', expected_output: '0' },
];

const judgeTests = [
  ['cpp','#include<iostream>\nusing namespace std;int main(){int a,b;cin>>a>>b;cout<<a+b;}','AC'],
  ['cpp','#include<iostream>\nusing namespace std;int main(){int a,b;cin>>a>>b;cout<<a*b;}','WA'],
  ['python','a,b=map(int,input().split())\nprint(a+b)','AC'],
  ['go','package main\nimport "fmt"\nfunc main(){var a,b int;fmt.Scan(&a,&b);fmt.Println(a+b)}','AC'],
  ['rust','use std::io;fn main(){let mut s=String::new();io::stdin().read_line(&mut s).unwrap();let v:Vec<i64>=s.trim().split_whitespace().map(|x|x.parse().unwrap()).collect();println!("{}",v[0]+v[1])}','AC'],
  ['java','import java.util.Scanner;public class Main{public static void main(String[] a){Scanner sc=new Scanner(System.in);System.out.println(sc.nextInt()+sc.nextInt());}}','AC'],
  ['kotlin','fun main(){val(a,b)=readLine()!!.split(" ").map{it.toInt()};println(a+b)}','AC'],
  ['typescript','const fs=require("fs");const[a,b]=fs.readFileSync("/dev/stdin","utf8").trim().split(" ").map(Number);console.log(a+b)','AC'],
  ['lua','local a,b=io.read("n","n")\nprint(a+b)','AC'],
  ['cpp','int main(){broken','CE'],
  ['cpp','#include<iostream>\nint main(){while(true){}}','TLE'],
];

async function main() {
  console.log('=== PART 1: quickRun — 20 languages with stdin ===\n');
  let pass1=0, total1=0;
  for (const [lang,code,inp,exp] of tests) {
    const s = Date.now();
    const r = await quickRun(code, inp, lang);
    const ms = Date.now() - s;
    total1 += ms;
    const out = (r.output||'').trim();
    const ok = out === exp && r.verdict === 'OK';
    console.log((ok?'OK  ':'FAIL') + ' ' + lang.padEnd(12) + String(ms).padStart(7) + 'ms' + (ok ? '' : '  out=' + JSON.stringify(out) + ' err=' + (r.stderr||r.error||'').substring(0,100)));
    if (ok) pass1++;
  }
  console.log('\nquickRun: ' + pass1 + '/' + tests.length + ' passed | total=' + total1 + 'ms\n');

  console.log('=== PART 2: judge() auto-check — multi-testcase ===\n');
  let pass2 = 0;
  for (const [lang, code, expectedVerdict] of judgeTests) {
    const s = Date.now();
    const r = await judge(code, tc3, lang);
    const ms = Date.now() - s;
    const ok = r.verdict === expectedVerdict;
    const dots = r.results ? r.results.map(x => x.verdict).join(',') : (r.compileError ? 'CE' : '?');
    console.log((ok?'OK  ':'FAIL') + ' ' + lang.padEnd(12) + expectedVerdict.padEnd(4) + '→ ' + r.verdict.padEnd(4) + String(ms).padStart(7) + 'ms  [' + dots + ']');
    if (ok) pass2++;
  }
  console.log('\njudge: ' + pass2 + '/' + judgeTests.length + ' passed\n');

  console.log('=== SUMMARY ===');
  console.log('quickRun: ' + pass1 + '/' + tests.length);
  console.log('judge:    ' + pass2 + '/' + judgeTests.length);
  console.log('Speed:    ' + total1 + 'ms total for 20 quickRun executions');
  process.exit(pass1 === tests.length && pass2 === judgeTests.length ? 0 : 1);
}
main();
