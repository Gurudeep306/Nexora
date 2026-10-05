#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long acc = 0;                               /* 0 is the XOR identity */
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        acc ^= x;                                    /* pairs cancel: x ^ x = 0 */
    }
    printf("%lld\n", acc);
    return 0;
}
