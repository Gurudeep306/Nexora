use std::io::{self, Read, Write, BufWriter};
use std::collections::{HashMap, VecDeque};

#[derive(Debug)]
struct Node { val: i32, next: Option<Box<Node>> }

fn sq(x: i64) -> i64 {
    x * x
}

fn main() {
    let mut s = String::new();
    io::stdin().read_to_string(&mut s).unwrap();
    let mut it = s.split_ascii_whitespace().map(|x| x.parse::<i64>().unwrap());
    let n = it.next().unwrap() as usize;
    let mut a: Vec<i64> = (0..n).map(|_| it.next().unwrap()).collect();
    for i in 0..n {
        if a[i] > 2 { a[i] = sq(a[i]); }
    }
    let mut m = HashMap::new();
    *m.entry("x").or_insert(0) += 1;
    let mut q = VecDeque::new();
    q.push_back(1);
    while let Some(u) = q.pop_front() {
        if u < 3 { q.push_back(u + 1); }
    }
    let out = io::stdout();
    let mut w = BufWriter::new(out.lock());
    writeln!(w, "{:?} {:?}", a, m).unwrap();
    println!("{}", a.len());
}
