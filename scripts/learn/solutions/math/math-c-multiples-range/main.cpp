#include <bits/stdc++.h>
using namespace std;

// floor(a / b) for b > 0 (C++ '/' truncates toward zero)
long long floorDiv(long long a, long long b) {
    long long q = a / b;
    if (a % b != 0 && a < 0) q--;
    return q;
}

int main() {
    int t;
    scanf("%d", &t);
    string out;
    while (t--) {
        long long L, R, k;
        scanf("%lld %lld %lld", &L, &R, &k);
        out += to_string(floorDiv(R, k) - floorDiv(L - 1, k));
        out += '\n';
    }
    fputs(out.c_str(), stdout);
}
