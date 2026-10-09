#include <bits/stdc++.h>
using namespace std;

int main() {
    int T;
    scanf("%d", &T);
    string out;
    while (T--) {
        long long n;
        scanf("%lld", &n);
        // closed form for k=2: n = 2^m + l (0 <= l < 2^m) -> survivor 2l+1
        long long p = 1;
        while (p * 2 <= n) p *= 2;    // largest power of two <= n
        long long l = n - p;
        out += to_string(2 * l + 1);
        out += '\n';
    }
    fputs(out.c_str(), stdout);
    return 0;
}
