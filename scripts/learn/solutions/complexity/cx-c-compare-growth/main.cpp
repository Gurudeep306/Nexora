#include <bits/stdc++.h>
using namespace std;

int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        array<int, 3> f, g;                       // (base p, power of n, power of log n)
        scanf("%d %d %d %d %d %d", &f[0], &f[1], &f[2], &g[0], &g[1], &g[2]);
        puts(f < g ? "<" : f > g ? ">" : "=");    // lexicographic: p, then a, then b
    }
}
