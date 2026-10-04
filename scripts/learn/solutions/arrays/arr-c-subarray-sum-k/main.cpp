#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long k;
    cin >> n >> k;
    unordered_map<long long, long long> seen;
    seen.reserve(2 * n + 1);
    seen[0] = 1;                                 // the empty prefix
    long long p = 0, count = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        p += x;
        auto it = seen.find(p - k);              // earlier prefixes P with p - P = k
        if (it != seen.end()) count += it->second;
        seen[p]++;
    }
    cout << count << "\n";
}
