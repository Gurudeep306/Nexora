#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long total = 0;          /* 64-bit: the sum can reach 2e14 */
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        total += x;
    }
    printf("%lld\n", total);
    return 0;
}
