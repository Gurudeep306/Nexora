#include <stdio.h>

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n, c, p = 1;
        int k = 0;
        scanf("%lld %lld", &n, &c);
        while (p < n) {
            k++;
            if (p > (n - 1) / c) break;               /* p*c >= n: stop before overflowing */
            p *= c;
        }
        printf("%d\n", k);
    }
    return 0;
}
