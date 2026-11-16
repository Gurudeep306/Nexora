using System;
using System.Collections.Generic;
using System.Linq;

class Node {
    public int Val;
    public Node Next;
    public Node(int v, Node n) { Val = v; Next = n; }
}

class Program {
    static int Fib(int n) {
        if (n < 2) return n;
        return Fib(n - 1) + Fib(n - 2);
    }
    static Node Reverse(Node head) {
        Node prev = null, cur = head;
        while (cur != null) {
            var nxt = cur.Next;
            cur.Next = prev;
            prev = cur;
            cur = nxt;
        }
        return prev;
    }
    static void Main() {
        var st = new Stack<int>();
        st.Push(1); st.Push(2); st.Pop();
        var q = new Queue<int>();
        q.Enqueue(3); q.Enqueue(4); q.Dequeue();
        var d = new Dictionary<string, int>();
        foreach (var w in "a b a".Split(' ')) { d.TryGetValue(w, out int c); d[w] = c + 1; }
        Node head = null;
        for (int i = 3; i >= 1; i--) head = new Node(i, head);
        head = Reverse(head);
        int total;
        total = Fib(6);
        var grid = new int[2, 3];
        grid[1, 2] = 5;
        Console.WriteLine($"{st.Peek()} {q.Peek()} {d["a"]} {head.Val} {total} {grid[1, 2]}");
    }
}
