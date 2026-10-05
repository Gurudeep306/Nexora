#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long W;
    scanf("%d %lld", &n, &W);
    vector<long long> w(n);
    vector<int> v(n);
    int V = 0;
    for (int i = 0; i < n; i++) { scanf("%lld %d", &w[i], &v[i]); V += v[i]; }
    const long long INF = LLONG_MAX / 4;          // INF + w cannot overflow
    vector<long long> mw(V + 1, INF);
    mw[0] = 0;
    for (int i = 0; i < n; i++)
        for (int t = V; t >= v[i]; t--)           // min weight for value exactly t
            mw[t] = min(mw[t], mw[t - v[i]] + w[i]);
    int ans = V;
    while (mw[ans] > W) ans--;
    printf("%d\n", ans);
}
