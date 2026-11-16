use std::collections::VecDeque;

fn main() {
    let n = 5;
    let edges = vec![(0, 1), (0, 2), (1, 3), (2, 4)];
    let mut adj = vec![Vec::new(); n];
    for &(u, v) in &edges {
        adj[u].push(v);
        adj[v].push(u);
    }
    let mut dist = vec![-1i32; n];
    dist[0] = 0;
    let mut q = VecDeque::new();
    q.push_back(0);
    while let Some(u) = q.pop_front() {
        for &v in &adj[u] {
            if dist[v] == -1 {
                dist[v] = dist[u] + 1;
                q.push_back(v);
            }
        }
    }
    println!("{:?}", dist);
}
