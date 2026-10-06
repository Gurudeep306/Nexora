#include <bits/stdc++.h>
using namespace std;
typedef unsigned long long ull;

// r^k, or n + 1 if it exceeds n (never overflows)
ull capped_pow(ull r, int k, ull n) {
    ull p = 1;
    for (int i = 0; i < k; i++) {
        if (p > n / r) return n + 1;
        p *= r;
    }
    return p;
}

ull iroot(ull n, int k) {
    ull r = (ull)llroundl(powl((long double)n, 1.0L / k));
    if (r < 1) r = 1;
    while (r > 1 && capped_pow(r, k, n) > n) r--;
    while (capped_pow(r + 1, k, n) <= n) r++;
    return r;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int T;
    cin >> T;
    while (T--) {
        ull n;
        cin >> n;
        ull a = n;
        int best = 1;
        for (int k = 59; k >= 2; k--) {
            ull r = iroot(n, k);
            if (r >= 2 && capped_pow(r, k, n) == n) { a = r; best = k; break; }
        }
        cout << a << ' ' << best << '\n';
    }
}
