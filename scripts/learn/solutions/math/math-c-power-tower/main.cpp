#include <bits/stdc++.h>
using namespace std;
const long long P = 1000000007LL;

long long power(long long b, long long e, long long m) {   // b < m <= P
    long long r = 1 % m;
    while (e > 0) {
        if (e & 1) r = r * b % m;
        b = b * b % m;
        e >>= 1;
    }
    return r;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int q;
    cin >> q;
    string out;
    while (q--) {
        long long a, b, c;
        cin >> a >> b >> c;
        long long r = a % P, ans;
        if (r == 0) ans = (b == 0 && c > 0) ? 1 : 0;        // exponent b^c is 0 only then
        else ans = power(r, power(b % (P - 1), c, P - 1), P);   // Fermat: exponent mod P-1
        out += to_string(ans);
        out += '\n';
    }
    cout << out;
}
