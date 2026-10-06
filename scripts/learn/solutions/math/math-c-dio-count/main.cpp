#include <bits/stdc++.h>
using namespace std;

// iterative extended Euclid: returns g = gcd(a, b) and x with a*x + b*y = g
long long extGcd(long long a, long long b, long long &x) {
    long long x0 = 1, x1 = 0;
    while (b) {
        long long q = a / b, t;
        t = a - q * b; a = b; b = t;
        t = x0 - q * x1; x0 = x1; x1 = t;
    }
    x = x0;
    return a;
}

// smallest x >= 0 with a*x ≡ c (mod b); false if gcd(a, b) does not divide c
bool minX(long long a, long long b, long long c, long long &x, long long &y) {
    long long xg;
    long long g = extGcd(a, b, xg);
    if (c % g != 0) return false;
    long long m = b / g;
    // reduce both factors mod m first: the product stays below 1e18
    x = (((xg % m) + m) % m) * ((((c / g) % m) + m) % m) % m;
    y = (c - a * x) / b;                     // |a*x| < 1e18, exact division
    return true;
}

int main() {
    int t;
    scanf("%d", &t);
    string out;
    while (t--) {
        long long a, b, c, x, y;
        scanf("%lld %lld %lld", &a, &b, &c);
        long long ans = 0;
        if (minX(a, b, c, x, y) && y >= 0) {
            long long step = a / __gcd(a, b);       // y decreases by a/g per solution
            ans = y / step + 1;
        }
        out += to_string(ans) + '\n';
    }
    fputs(out.c_str(), stdout);
}
