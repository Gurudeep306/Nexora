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

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long total = 0;
    for (int i = 0; i < n; i++) {
        long long a, b;
        cin >> a >> b;
        a = (a % P + P) % P;                              // negative numerators
        total = (total + a * power(b, P - 2)) % P;        // a / b = a * b^(p-2)
    }
    cout << total << '\n';
}
