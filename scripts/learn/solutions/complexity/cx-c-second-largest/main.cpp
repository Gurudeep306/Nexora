#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    long long first = LLONG_MIN, second = LLONG_MIN;
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        if (x > first) { second = first; first = x; }
        else if (x > second) second = x;
    }
    int lg = 0;                                   // ceil(log2 n) = bit length of n - 1
    while ((1LL << lg) < n) lg++;
    printf("%lld %d\n", second, n + lg - 2);
}
