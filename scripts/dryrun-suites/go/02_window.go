package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	in := bufio.NewReader(os.Stdin)
	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()
	var n, k int
	fmt.Fscan(in, &n, &k)
	a := make([]int, n)
	for i := range a {
		fmt.Fscan(in, &a[i])
	}
	best, sum, l := 0, 0, 0
	for r := 0; r < n; r++ {
		sum += a[r]
		for sum > k {
			sum -= a[l]
			l++
		}
		if r-l+1 > best {
			best = r - l + 1
		}
	}
	fmt.Fprintln(out, best)
}
