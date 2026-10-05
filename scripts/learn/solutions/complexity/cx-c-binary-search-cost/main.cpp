#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> a(n);
    for (auto &x : a) scanf("%lld", &x);
    int q;
    scanf("%d", &q);
    string out;
    while (q--) {
        long long x;
        scanf("%lld", &x);
        int lo = 0, hi = n - 1, probes = 0;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            probes++;                                  // one read of a[mid]
            if (a[mid] == x) break;
            if (a[mid] < x) lo = mid + 1; else hi = mid - 1;
        }
        out += to_string(probes);
        out += '\n';
    }
    fputs(out.c_str(), stdout);
}
