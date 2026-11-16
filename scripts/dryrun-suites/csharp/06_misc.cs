using System;
using System.Collections.Generic;
using System.Linq;

class Solution {
    static long Gcd(long a, long b) { while (b != 0) { var t = a % b; a = b; b = t; } return a; }
    static IEnumerable<int> Evens(int n) { for (int i = 0; i < n; i += 2) yield return i; }
    static bool TryHalf(int x, out int h) { h = x / 2; return x % 2 == 0; }
    static void Main(string[] args) {
        var pq = new PriorityQueue<string, int>();
        pq.Enqueue("b", 2); pq.Enqueue("a", 1);
        var seen = new HashSet<int>();
        int i = 0;
        do { seen.Add(i * i % 5); i++; } while (i < 6);
        var (p, q) = (3, 4);
        string s = "abc";
        char[] cs = s.ToCharArray();
        Array.Reverse(cs);
        var jag = new int[2][];
        jag[0] = new[] { 1 }; jag[1] = new[] { 2, 3 };
        TryHalf(10, out var h);
        var sum = Evens(7).Sum();
        switch (sum % 3) { case 0: sum++; break; default: sum--; break; }
        Console.WriteLine($"{Gcd(12, 18)} {pq.Dequeue()} {seen.Count} {p + q} {new string(cs)} {jag[1][1]} {h} {sum}");
    }
}
