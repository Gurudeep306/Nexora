#include <stdio.h>

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        scanf("%lld", &n);
        printf("%lld\n", n * (n + 1) * (n + 2) / 6);   /* C(n+2, 3) */
    }
    return 0;
}
