#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    const long long M = 1000000007LL;
    int n;
    cin >> n;
    long long s = 0, p = 1;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        long long r = ((x % M) + M) % M;   // C++ % keeps the sign of x
        s = (s + r) % M;
        p = p * r % M;                     // both < M, product < 2^63
    }
    cout << s << ' ' << p << '\n';
}
