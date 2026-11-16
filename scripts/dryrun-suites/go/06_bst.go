package main

import "fmt"

type Node struct {
	key         int
	left, right *Node
}

func insert(r *Node, k int) *Node {
	if r == nil {
		return &Node{key: k}
	}
	if k < r.key {
		r.left = insert(r.left, k)
	} else {
		r.right = insert(r.right, k)
	}
	return r
}

func inorder(r *Node, out *[]int) {
	if r == nil {
		return
	}
	inorder(r.left, out)
	*out = append(*out, r.key)
	inorder(r.right, out)
}

func main() {
	var root *Node
	for _, k := range []int{50, 30, 70, 20, 40} {
		root = insert(root, k)
	}
	res := []int{}
	inorder(root, &res)
	fmt.Println(res)
}
