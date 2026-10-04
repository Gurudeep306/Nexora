#include <bits/stdc++.h>
using namespace std;

int n;
vector<int> a;

long long atMost(int K) {                         // subarrays with at most K odd numbers
    long long total = 0;
    int lo = 0, odd = 0;
    for (int hi = 0; hi < n; hi++) {
        odd += a[hi] & 1;
        while (odd > K) odd -= a[lo++] & 1;
        total += hi - lo + 1;                     // every start in [lo, hi]
    }
    return total;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int k;
    cin >> n >> k;
    a.resize(n);
    for (auto &v : a) cin >> v;
    cout << atMost(k) - atMost(k - 1) << "\n";
}
