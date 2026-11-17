using System;
struct Point { public int X; public int Y; }
class Program {
    struct UF {
        public int[] p;
        public int count;
        public UF(int n) { p = new int[n]; for (int i = 0; i < n; i++) p[i] = i; count = n; }
        public int Find(int x) { return p[x] == x ? x : Find(p[x]); }
        public void Unite(int a, int b) { int ra = Find(a), rb = Find(b); if (ra != rb) { p[ra] = rb; count--; } }
    }
    static void Main() {
        var uf = new UF(5);
        uf.Unite(0, 1);
        uf.Unite(2, 3);
        uf.Unite(1, 3);
        var pt = new Point { X = 2, Y = 3 };
        Console.WriteLine(uf.count + " " + pt.X);
    }
}
