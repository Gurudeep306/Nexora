package main

import (
	"fmt"
	"strings"
)

type Shape interface{ Area() float64 }
type Rect struct{ w, h float64 }

func (r Rect) Area() float64 { return r.w * r.h }

func divmod(a, b int) (q, r int) {
	q = a / b
	r = a % b
	return
}

func Max[T int | float64](a, b T) T {
	if a > b {
		return a
	}
	return b
}

func describe(x any) string {
	switch v := x.(type) {
	case int:
		return fmt.Sprint("int ", v)
	case string:
		return "string " + v
	default:
		return "other"
	}
}

func main() {
	var s Shape = Rect{2, 3}
	q, r := divmod(17, 5)
	cnt := map[string]int{}
	for _, w := range strings.Fields("a b a c a") {
		cnt[w]++
	}
	var memo = map[int]int{}
	var fib func(int) int
	fib = func(n int) int {
		if n < 2 {
			return n
		}
		if v, ok := memo[n]; ok {
			return v
		}
		memo[n] = fib(n-1) + fib(n-2)
		return memo[n]
	}
	total := 0
outer:
	for i := 0; i < 5; i++ {
		for j := 0; j < 5; j++ {
			if i*j > 6 {
				break outer
			}
			total += i * j
		}
	}
	switch {
	case total > 10:
		total++
		fallthrough
	case total > 5:
		total += 2
	}
	fmt.Println(s.Area(), q, r, cnt["a"], fib(10), Max(3, 9), Max(2.5, 1.5), describe(7), describe("x"), total)
	fmt.Printf("%d-%s\n", len(cnt), strings.Repeat("=", 3))
}
