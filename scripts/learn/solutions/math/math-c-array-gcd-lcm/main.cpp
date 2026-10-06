#include <bits/stdc++.h>
using namespace std;

int main() {
    const long long CAP = 1000000000000000000LL;
    int n;
    scanf("%d", &n);
    long long g = 0, l = 1;
    bool over = false;
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        g = __gcd(g, x);
        if (!over) {
            long long q = l / __gcd(l, x);          // divide before multiplying
            if (q > CAP / x) over = true;            // q * x would exceed 1e18
            else l = q * x;
        }
    }
    printf("%lld\n%lld\n", g, over ? -1LL : l);
}
