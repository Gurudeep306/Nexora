#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long k;
    scanf("%d %lld", &n, &k);
    vector<long long> r(n + 1);
    r[0] = 0;                                         // empty prefix
    for (int i = 1; i <= n; i++) {
        long long x;
        scanf("%lld", &x);
        r[i] = ((r[i - 1] + x) % k + k) % k;          // keep residues in [0, k)
    }
    sort(r.begin(), r.end());
    long long ans = 0;
    for (int i = 0, j; i <= n; i = j) {
        for (j = i; j <= n && r[j] == r[i]; j++) {}
        long long c = j - i;
        ans += c * (c - 1) / 2;                       // pairs with equal residue
    }
    printf("%lld\n", ans);
}
