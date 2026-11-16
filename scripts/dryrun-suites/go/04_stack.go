package main

import "fmt"

func valid(s string) bool {
	st := []byte{}
	pair := map[byte]byte{')': '(', ']': '[', '}': '{'}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c == '(' || c == '[' || c == '{' {
			st = append(st, c)
		} else {
			if len(st) == 0 || st[len(st)-1] != pair[c] {
				return false
			}
			st = st[:len(st)-1]
		}
	}
	return len(st) == 0
}

func main() {
	fmt.Println(valid("([]{})"), valid("(]"))
}
