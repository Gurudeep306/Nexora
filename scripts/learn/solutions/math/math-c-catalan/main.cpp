#include <bits/stdc++.h>
using namespace std;
const long long P = 1'000'000'007LL;

long long power(long long b, long long e) {
    long long r = 1;
    b %= P;
    while (e > 0) {
        if (e & 1) r = r * b % P;
        b = b * b % P;
        e >>= 1;
    }
    return r;
}

vector<long long> F, IF;
void buildFact(int N) {                       // factorials and inverse factorials up to N
    F.assign(N + 1, 1);
    IF.assign(N + 1, 1);
    for (int i = 1; i <= N; i++) F[i] = F[i - 1] * i % P;
    IF[N] = power(F[N], P - 2);               // one Fermat inverse ...
    for (int i = N; i > 0; i--) IF[i - 1] = IF[i] * i % P;   // ... then walk down
}
long long C(long long n, long long r) {
    if (r < 0 || n < 0 || r > n) return 0;
    return F[n] * IF[r] % P * IF[n - r] % P;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    buildFact(2'000'001);
    int t;
    cin >> t;
    string out;
    while (t--) {
        long long n;
        cin >> n;
        out += to_string(F[2 * n] * IF[n] % P * IF[n + 1] % P);   // (2n)! / (n! (n+1)!)
        out += '\n';
    }
    cout << out;
}
