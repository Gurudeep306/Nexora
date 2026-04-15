const http = require('http');

function judgeTest(lang, code, testcases) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ code, language: lang, testcases });
    const req = http.request({
      hostname: 'localhost', port: 3000, path: '/api/judge',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve({error: body}); } });
    });
    req.on('error', e => resolve({error: e.message}));
    req.setTimeout(60000, () => { req.destroy(); resolve({error:'TIMEOUT'}); });
    req.write(data);
    req.end();
  });
}

const tc = [
  { id: 1, label: 'Test 1', input: '3 5', expected_output: '8' },
  { id: 2, label: 'Test 2', input: '10 20', expected_output: '30' },
  { id: 3, label: 'Test 3', input: '0 0', expected_output: '0' },
];

async function main() {
  console.log('Testing judge (auto-check) with 3 test cases per language...\n');

  // C++ correct
  let r = await judgeTest('cpp',
    '#include<iostream>\nusing namespace std;\nint main(){int a,b;cin>>a>>b;cout<<a+b;}', tc);
  console.log('C++ correct:', r.verdict, r.results?.map(x => x.verdict).join(','));

  // C++ wrong (multiply instead of add)
  r = await judgeTest('cpp',
    '#include<iostream>\nusing namespace std;\nint main(){int a,b;cin>>a>>b;cout<<a*b;}', tc);
  console.log('C++ wrong:  ', r.verdict, r.results?.map(x => x.verdict).join(','));

  // Python correct
  r = await judgeTest('python', 'a,b=map(int,input().split())\nprint(a+b)', tc);
  console.log('Py  correct:', r.verdict, r.results?.map(x => x.verdict).join(','));

  // Python wrong
  r = await judgeTest('python', 'a,b=map(int,input().split())\nprint(a-b)', tc);
  console.log('Py  wrong:  ', r.verdict, r.results?.map(x => x.verdict).join(','));

  // Go correct (local)
  r = await judgeTest('go',
    'package main\nimport "fmt"\nfunc main(){var a,b int;fmt.Scan(&a,&b);fmt.Println(a+b)}', tc);
  console.log('Go  correct:', r.verdict, r.results?.map(x => x.verdict).join(','));

  // Rust correct (local)
  r = await judgeTest('rust',
    'use std::io;\nfn main(){let mut s=String::new();io::stdin().read_line(&mut s).unwrap();let v:Vec<i64>=s.trim().split_whitespace().map(|x|x.parse().unwrap()).collect();println!("{}",(v[0]+v[1]))}', tc);
  console.log('Rs  correct:', r.verdict, r.results?.map(x => x.verdict).join(','));

  // Java correct (Wandbox)
  r = await judgeTest('java',
    'import java.util.Scanner;public class Main{public static void main(String[] a){Scanner sc=new Scanner(System.in);System.out.println(sc.nextInt()+sc.nextInt());}}', tc);
  console.log('Jav correct:', r.verdict, r.results?.map(x => x.verdict).join(','));

  // Kotlin correct (Kotlin Playground)
  r = await judgeTest('kotlin',
    'fun main(){val(a,b)=readLine()!!.split(" ").map{it.toInt()};println(a+b)}', tc);
  console.log('Kt  correct:', r.verdict, r.results?.map(x => x.verdict).join(','));

  // TypeScript correct (local tsx)
  r = await judgeTest('typescript',
    'const fs=require("fs");const[a,b]=fs.readFileSync("/dev/stdin","utf8").trim().split(" ").map(Number);console.log(a+b)', tc);
  console.log('TS  correct:', r.verdict, r.results?.map(x => x.verdict).join(','));

  // Lua correct (local)
  r = await judgeTest('lua',
    'local a,b=io.read("n","n")\nprint(a+b)', tc);
  console.log('Lua correct:', r.verdict, r.results?.map(x => x.verdict).join(','));

  // C++ compile error
  r = await judgeTest('cpp', 'int main(){broken code}', tc);
  console.log('C++ CE:     ', r.verdict, r.compileError ? 'has CE msg' : 'no CE msg');

  // C++ TLE (infinite loop)
  r = await judgeTest('cpp',
    '#include<iostream>\nint main(){while(true){}}', tc);
  console.log('C++ TLE:    ', r.verdict, r.results?.map(x => x.verdict).join(','));

  console.log('\nDone!');
}
main();
