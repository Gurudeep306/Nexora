#include <bits/stdc++.h>
using namespace std;

int main() {
    long long n;
    cin >> n;
    long long cnt = 1, sig = 1;
    for (long long d = 2; d * d <= n; d += (d == 2 ? 1 : 2)) {
        if (n % d) continue;
        int e = 0;
        long long term = 1, pw = 1;           // term = 1 + d + ... + d^e
        while (n % d == 0) { n /= d; e++; pw *= d; term += pw; }
        cnt *= e + 1;
        sig *= term;
    }
    if (n > 1) { cnt *= 2; sig *= n + 1; }    // one prime > sqrt left over
    cout << cnt << ' ' << sig << '\n';
}
