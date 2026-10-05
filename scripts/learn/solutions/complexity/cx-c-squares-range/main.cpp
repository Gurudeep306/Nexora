#include <bits/stdc++.h>
using namespace std;

long long isqrt_ll(long long m) {
    long long r = (long long)sqrt((double)m);         // guess, may be off by one
    while (r * r > m) r--;
    while ((r + 1) * (r + 1) <= m) r++;               // now r^2 <= m < (r+1)^2
    return r;
}

int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long a, b;
        scanf("%lld %lld", &a, &b);
        printf("%lld\n", isqrt_ll(b) - isqrt_ll(a - 1));
    }
}
