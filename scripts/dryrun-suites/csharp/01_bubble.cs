using System;

class Program {
    static void Main() {
        int[] a = { 5, 1, 4, 2, 8 };
        int n = a.Length;
        for (int i = 0; i < n; i++)
            for (int j = 0; j + 1 < n - i; j++)
                if (a[j] > a[j + 1]) { int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
        Console.WriteLine(string.Join(" ", a));
    }
}
