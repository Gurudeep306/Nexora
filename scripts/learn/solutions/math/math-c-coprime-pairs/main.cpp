#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    const int N = 1000000;
    vector<int> phi(N + 1);
    iota(phi.begin(), phi.end(), 0);
    for (int p = 2; p <= N; p++)
        if (phi[p] == p)                              // untouched => prime
            for (int j = p; j <= N; j += p) phi[j] -= phi[j] / p;
    vector<long long> pre(N + 1, 0);
    for (int v = 1; v <= N; v++) pre[v] = pre[v - 1] + phi[v];
    int q;
    cin >> q;
    string out;
    while (q--) {
        int n;
        cin >> n;
        out += to_string(2 * pre[n] - 1);
        out += '\n';
    }
    cout << out;
}
