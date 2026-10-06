#include <bits/stdc++.h>
using namespace std;

long long gcdll(long long a, long long b) {        // a, b >= 0
    while (b) { long long t = a % b; a = b; b = t; }
    return a;
}

int main() {
    int t;
    scanf("%d", &t);
    string out;
    while (t--) {
        long long p, q;
        scanf("%lld %lld", &p, &q);
        long long g = gcdll(llabs(p), llabs(q));   // > 0 because q != 0
        p /= g; q /= g;
        if (q < 0) { p = -p; q = -q; }             // sign lives in the numerator
        out += to_string(p) + '/' + to_string(q) + '\n';
    }
    fputs(out.c_str(), stdout);
}
