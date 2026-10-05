#include <bits/stdc++.h>
using namespace std;

long long isqrt_ll(long long n) {
    long long r = (long long)sqrt((double)n);         // guess, may be off by one
    while (r * r > n) r--;
    while ((r + 1) * (r + 1) <= n) r++;               // now r^2 <= n < (r+1)^2
    return r;
}

int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        scanf("%lld", &n);
        int c = 0;
        while (n >= 2) { n = isqrt_ll(n); c++; }
        printf("%d\n", c);
    }
}
