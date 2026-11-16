package main

import "fmt"

var parent [6]int

func find(x int) int {
	if parent[x] != x {
		parent[x] = find(parent[x])
	}
	return parent[x]
}

func union(a, b int) {
	parent[find(a)] = find(b)
}

func main() {
	for i := range parent {
		parent[i] = i
	}
	union(0, 1)
	union(2, 3)
	union(1, 3)
	fmt.Println(find(0) == find(2), find(4) == find(5))
}
