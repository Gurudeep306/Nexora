fn find(p: &mut Vec<usize>, x: usize) -> usize {
    if p[x] != x {
        let r = find(p, p[x]);
        p[x] = r;
    }
    p[x]
}

fn main() {
    let mut parent: Vec<usize> = (0..6).collect();
    let pairs = [(0, 1), (2, 3), (1, 3)];
    for &(a, b) in pairs.iter() {
        let ra = find(&mut parent, a);
        let rb = find(&mut parent, b);
        parent[ra] = rb;
    }
    println!("{} {}", find(&mut parent, 0) == find(&mut parent, 2), find(&mut parent, 4) == find(&mut parent, 5));
}
