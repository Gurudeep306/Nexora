#include <bits/stdc++.h>
using namespace std;

int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n, b;
        scanf("%lld %lld", &n, &b);
        int d = 1;
        while (n >= b) { n /= b; d++; }               // strip one base-b digit
        printf("%d\n", d);
    }
}
