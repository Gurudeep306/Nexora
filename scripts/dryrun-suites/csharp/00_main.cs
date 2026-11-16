using System;
using System.Collections.Generic;

class Node { public int val; public Node next; public Node(int v) { val = v; } }

class Program {
    static long Sq(long x) {
        return x * x;
    }
    static void Main() {
        int n = int.Parse(Console.ReadLine());
        var a = Array.ConvertAll(Console.ReadLine().Split(' '), int.Parse);
        int s;
        for (int i = 0; i < n; i++) {
            if (a[i] > 2) a[i] = (int)Sq(a[i]);
        }
        foreach (var x in a) Console.Write(x + " ");
        var d = new Dictionary<string, int>();
        d["x"] = 1;
        int Dfs(int u) { if (u == 0) return 0; return Dfs(u - 1) + 1; }
        s = Dfs(3);
        Console.WriteLine(s);
    }
}
