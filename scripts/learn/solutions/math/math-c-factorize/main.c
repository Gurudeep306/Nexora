#include <stdio.h>

int main(void) {
    int t;
    scanf("%d", &t);
    while (t--) {
        long long n;
        scanf("%lld", &n);
        int first = 1;
        for (long long d = 2; d * d <= n; d++) {
            if (n % d) continue;
            int e = 0;
            while (n % d == 0) { n /= d; e++; }
            printf(first ? "%lld^%d" : " %lld^%d", d, e);
            first = 0;
        }
        if (n > 1) printf(first ? "%lld^1" : " %lld^1", n);
        putchar('\n');
    }
    return 0;
}
