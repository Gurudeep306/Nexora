package main

import "fmt"

func main() {
	a := []int{5, 1, 4, 2, 8}
	n := len(a)
	for i := 0; i < n; i++ {
		for j := 0; j+1 < n-i; j++ {
			if a[j] > a[j+1] {
				a[j], a[j+1] = a[j+1], a[j]
			}
		}
	}
	fmt.Println(a)
}
