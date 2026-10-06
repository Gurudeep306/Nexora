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

long long floorDiv(long long a, long long b) {      // b > 0
    long long q = a / b;
    if (a % b != 0 && a < 0) q--;
    return q;
}

int main() {
    int t;
    scanf("%d", &t);
    string out;
    while (t--) {
        long long a, b, c, x1, y1;
        scanf("%lld %lld %lld", &a, &b, &c);
        if (!minX(a, b, c, x1, y1)) { out += "-1\n"; continue; }
        long long g = __gcd(a, b), m = b / g, n = a / g;
        long long q = floorDiv(y1, n);
        long long cand[4] = {-1, 0, q, q + 1};          // floors/ceils of both corners
        long long bx = 0, by = 0, bestCost = -1;
        for (long long k : cand) {
            long long x = x1 + k * m, y = y1 - k * n;
            long long cost = llabs(x) + llabs(y);
            if (bestCost < 0 || cost < bestCost || (cost == bestCost && x < bx)) {
                bestCost = cost; bx = x; by = y;
            }
        }
        out += to_string(bx) + ' ' + to_string(by) + '\n';
    }
    fputs(out.c_str(), stdout);
}
