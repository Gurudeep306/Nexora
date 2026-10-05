#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> a(n);
    for (auto &v : a) scanf("%lld", &v);
    long long mn, mx, comps = 0;
    int i;
    if (n % 2) { mn = mx = a[0]; i = 1; }
    else {
        comps++;
        if (a[0] < a[1]) { mn = a[0]; mx = a[1]; } else { mn = a[1]; mx = a[0]; }
        i = 2;
    }
    for (; i + 1 < n; i += 2) {
        long long lo = a[i], hi = a[i + 1];
        comps++; if (hi < lo) swap(lo, hi);       // compare inside the pair
        comps++; if (lo < mn) mn = lo;            // loser challenges the min
        comps++; if (hi > mx) mx = hi;            // winner challenges the max
    }
    printf("%lld %lld %lld\n", mn, mx, comps);
}
