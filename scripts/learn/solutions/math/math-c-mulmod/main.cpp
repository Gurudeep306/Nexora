#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int q;
    cin >> q;
    string out;
    while (q--) {
        long long a, b, m;
        cin >> a >> b >> m;
        a = (a % m + m) % m;
        b = (b % m + m) % m;
        long long r = (long long)((__int128)a * b % m);   // 128-bit product: no overflow
        out += to_string(r);
        out += '\n';
    }
    cout << out;
}
