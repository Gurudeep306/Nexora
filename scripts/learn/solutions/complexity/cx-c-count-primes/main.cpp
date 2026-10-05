#include <bits/stdc++.h>
using namespace std;

int main() {
    int T;
    if (scanf("%d", &T) != 1) return 0;
    vector<int> q(T);
    int N = 2;
    for (auto &x : q) { scanf("%d", &x); N = max(N, x); }
    vector<char> composite(N + 1, 0);
    composite[0] = composite[1] = 1;
    for (long long i = 2; i * i <= N; i++)
        if (!composite[i])
            for (long long j = i * i; j <= N; j += i) composite[j] = 1;   // O(N log log N)
    vector<int> pi(N + 1, 0);
    for (int x = 1; x <= N; x++) pi[x] = pi[x - 1] + !composite[x];   // prefix counts
    string out;
    out.reserve(T * 8);
    for (int x : q) { out += to_string(pi[x]); out += '\n'; }
    fputs(out.c_str(), stdout);
}
