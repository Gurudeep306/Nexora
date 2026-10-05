#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    sort(a.begin(), a.end());
    long long best = LLONG_MAX;
    for (int i = 0; i + 1 < n; i++) best = min(best, a[i + 1] - a[i]);   // only neighbours can be closest
    printf("%lld\n", best);
}
