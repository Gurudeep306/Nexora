#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1000000007LL, INV4 = 250000002LL;   // 4 * INV4 = 1 (mod MOD)

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int T;
    cin >> T;
    while (T--) {
        long long n;
        cin >> n;
        // E[inversions] = C(n, 2) / 2 = n (n - 1) / 4
        cout << n % MOD * ((n - 1) % MOD) % MOD * INV4 % MOD << '\n';
    }
}
