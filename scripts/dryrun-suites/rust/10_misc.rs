use std::io::{self, Write, BufWriter};

#[derive(Clone, Copy, Debug)]
struct P(i32, i32);

fn fib(n: u64, memo: &mut Vec<u64>) -> u64 {
    if n < 2 {
        return n;
    }
    if memo[n as usize] != 0 {
        return memo[n as usize];
    }
    let v = fib(n - 1, memo) + fib(n - 2, memo);
    memo[n as usize] = v;
    v
}

fn main() {
    let out = io::stdout();
    let mut w = BufWriter::new(out.lock());
    let mut memo = vec![0u64; 50];
    let p = P(1, 2);
    let q = p;
    let total: i32 = (1..=4).sum();
    let x;
    if total > 5 { x = 1; } else { x = 2; }
    let mut grid = [[0i32; 3]; 2];
    grid[1][2] = 7;
    'outer: for i in 0..3 {
        for j in 0..3 {
            if i * j > 2 { break 'outer; }
        }
    }
    writeln!(w, "{} {} {} {} {:?}", fib(30, &mut memo), q.0 + p.1, total, x, grid).unwrap();
    write!(w, "done\n").unwrap();
}
