#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    const int N = 1000000;
    vector<int> spf(N + 1, 0);
    for (int p = 2; p <= N; p++) {
        if (spf[p]) continue;
        spf[p] = p;                                       // p is prime
        for (long long j = (long long)p * p; j <= N; j += p)
            if (!spf[j]) spf[j] = p;                     // first prime to reach j is its smallest
    }
    int q;
    cin >> q;
    string out;
    while (q--) {
        int x;
        cin >> x;
        bool first = true;
        while (x > 1) {
            if (!first) out += ' ';
            first = false;
            out += to_string(spf[x]);
            x /= spf[x];
        }
        out += '\n';
    }
    cout << out;
}
