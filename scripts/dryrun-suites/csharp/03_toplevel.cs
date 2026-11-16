using System;
using System.Collections.Generic;

var list = new List<int> { 3, 1, 2 };
list.Sort();
int sum = 0;
foreach (var x in list)
    sum += x;
int Sq(int v) => v * v;
Console.WriteLine($"{string.Join(",", list)} {sum} {Sq(4)}");
