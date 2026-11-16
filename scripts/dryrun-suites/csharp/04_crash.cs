using System;

class Program {
    static int Get(int[] a, int i) {
        return a[i];
    }
    static void Main() {
        var a = new[] { 1, 2, 3 };
        Console.WriteLine(Get(a, 1));
        Console.WriteLine(Get(a, 5));
    }
}
