#include <bits/stdc++.h>
using namespace std;
const long long M = 1000000007LL;

long long tri(long long x) {                 // x(x+1)/2 mod M, x up to 1e12
    long long a = x, b = x + 1;
    if (a % 2 == 0) a /= 2; else b /= 2;     // halve the even factor first
    return (a % M) * (b % M) % M;
}

int main() {
    long long n;
    cin >> n;
    long long r = sqrtl((long double)n);
    while (r * r > n) r--;
    while ((r + 1) * (r + 1) <= n) r++;
    long long s = 0;
    for (long long i = 1; i <= r; i++) {
        long long q = n / i;
        s = (s + i % M * (q % M) + tri(q)) % M;   // d = i term, plus q = i term
    }
    s = ((s - r % M * tri(r)) % M + M) % M;       // the r x r square was counted twice
    cout << s << '\n';
}
