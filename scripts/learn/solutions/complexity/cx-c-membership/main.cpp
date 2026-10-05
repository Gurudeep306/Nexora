#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, q;
    scanf("%d", &n);
    vector<long long> a(n);
    for (auto &v : a) scanf("%lld", &v);
    sort(a.begin(), a.end());                     // pay O(n log n) once
    scanf("%d", &q);
    string out;
    out.reserve(4 * q);
    while (q--) {
        long long x;
        scanf("%lld", &x);
        out += binary_search(a.begin(), a.end(), x) ? "YES\n" : "NO\n";   // O(log n)
    }
    fputs(out.c_str(), stdout);
}
