using System;
using System.Collections.Generic;

var list = new List<int> { 3, 1 };
int Sq(int v) => v * v;
void Say(int v) => Console.WriteLine(v);
Say(Sq(list[0]));
var ps = new List<P> { new P(2), new P(1) };
ps.Sort();
Console.WriteLine(string.Join(",", ps) + " " + P.Twice(4));

class P : IComparable<P> {
    public int X;
    public P(int x) => X = x;
    public static int Twice(int x) => x * 2;
    public int CompareTo(P o) => X.CompareTo(o.X);
    public override string ToString() => $"P{X}";
}
