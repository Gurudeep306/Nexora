#include <bits/stdc++.h>
using namespace std;

int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n, c;
        scanf("%lld %lld", &n, &c);
        long long p = 1;
        int k = 0;
        while (p < n) {
            k++;
            if (p > (n - 1) / c) break;               // p*c >= n: stop before overflowing
            p *= c;                                   // p*c <= n-1: safe
        }
        printf("%d\n", k);
    }
}
