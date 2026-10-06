#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    const int N = 5000000;
    vector<char> comp(N + 1, 0);
    comp[0] = comp[1] = 1;
    for (long long p = 2; p * p <= N; p++)
        if (!comp[p])
            for (long long j = p * p; j <= N; j += p) comp[j] = 1;
    vector<int> pi(N + 1, 0);
    for (int v = 1; v <= N; v++) pi[v] = pi[v - 1] + !comp[v];   // prefix count of primes
    int q;
    cin >> q;
    string out;
    while (q--) {
        int n;
        cin >> n;
        out += to_string(pi[n]);
        out += '\n';
    }
    cout << out;
}
