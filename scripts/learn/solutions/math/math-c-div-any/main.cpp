#include <bits/stdc++.h>
using namespace std;

long long n;
int k;
vector<long long> a;
long long total = 0;

// subsets with lcm > n contribute 0, so they are never entered
void dfs(int i, long long l, int sz) {
    if (i == k) {
        if (sz) total += (sz % 2 ? 1 : -1) * (n / l);
        return;
    }
    dfs(i + 1, l, sz);                               // skip a[i]
    long long x = l / __gcd(l, a[i]);
    if (x <= n / a[i]) dfs(i + 1, x * a[i], sz + 1); // x * a[i] <= n: safe to multiply
}

int main() {
    cin >> n >> k;
    a.resize(k);
    for (auto &v : a) cin >> v;
    dfs(0, 1, 0);
    cout << total << '\n';
}
