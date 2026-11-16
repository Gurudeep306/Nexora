use std::io::{self, Read};

fn main() {
    let mut s = String::new();
    io::stdin().read_to_string(&mut s).unwrap();
    let v: Vec<i64> = s.split_whitespace().map(|x| x.parse().unwrap()).collect();
    let (n, k) = (v[0] as usize, v[1]);
    let a = &v[2..2 + n];
    let (mut best, mut sum, mut l) = (0usize, 0i64, 0usize);
    for r in 0..n {
        sum += a[r];
        while sum > k {
            sum -= a[l];
            l += 1;
        }
        best = best.max(r + 1 - l);
    }
    println!("{}", best);
}
