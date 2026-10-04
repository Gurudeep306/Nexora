#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long k;
    cin >> n >> k;
    unordered_map<long long, int> first;
    first.reserve(2 * n + 1);
    first[0] = 0;                                // prefix 0 before the first element
    long long p = 0;
    int best = 0;
    for (int j = 1; j <= n; j++) {
        long long x;
        cin >> x;
        p += x;
        auto it = first.find(p - k);
        if (it != first.end()) best = max(best, j - it->second);
        first.emplace(p, j);                     // emplace keeps the earliest position
    }
    cout << best << "\n";
}
