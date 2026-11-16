use std::cmp::Reverse;
use std::collections::{BinaryHeap, HashMap};

fn main() {
    let mut pq = BinaryHeap::new();
    for x in [5, 2, 8, 1] {
        pq.push(Reverse(x));
    }
    let mut order = vec![];
    while let Some(Reverse(x)) = pq.pop() {
        order.push(x);
    }
    let mut cnt: HashMap<char, usize> = HashMap::new();
    for c in "abca".chars() {
        *cnt.entry(c).or_insert(0) += 1;
    }
    let s = String::from("hi");
    let t = s;
    println!("{:?} {} {}", order, cnt[&'a'], t);
}
