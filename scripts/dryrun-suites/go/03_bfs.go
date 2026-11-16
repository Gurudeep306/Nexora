package main

import "fmt"

func main() {
	n := 5
	adj := make([][]int, n)
	edges := [][2]int{{0, 1}, {0, 2}, {1, 3}, {2, 4}}
	for _, e := range edges {
		adj[e[0]] = append(adj[e[0]], e[1])
		adj[e[1]] = append(adj[e[1]], e[0])
	}
	dist := make([]int, n)
	for i := range dist {
		dist[i] = -1
	}
	dist[0] = 0
	q := []int{0}
	for len(q) > 0 {
		u := q[0]
		q = q[1:]
		for _, v := range adj[u] {
			if dist[v] == -1 {
				dist[v] = dist[u] + 1
				q = append(q, v)
			}
		}
	}
	fmt.Println(dist)
}
