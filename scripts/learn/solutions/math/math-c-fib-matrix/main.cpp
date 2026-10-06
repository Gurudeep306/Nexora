#include <bits/stdc++.h>
using namespace std;
const long long M = 1000000007LL;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int q;
    cin >> q;
    string out;
    while (q--) {
        unsigned long long n;
        cin >> n;
        long long a = 0, b = 1;                           // (F(k), F(k+1)) with k = 0
        for (int bit = 63; bit >= 0; bit--) {
            long long c = a * ((2 * b - a + M) % M) % M;  // F(2k)
            long long d = (a * a + b * b) % M;            // F(2k+1)
            if ((n >> bit) & 1) { a = d; b = (c + d) % M; }
            else { a = c; b = d; }
        }
        out += to_string(a);
        out += '\n';
    }
    cout << out;
}
