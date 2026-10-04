#include <stdio.h>

int main(void) {
    int n;
    long long x, mx, mn;
    scanf("%d %lld", &n, &x);
    mx = mn = x;                        /* start from a real element */
    for (int i = 1; i < n; i++) {
        scanf("%lld", &x);
        if (x > mx) mx = x;
        if (x < mn) mn = x;
    }
    printf("%lld %lld\n", mx, mn);
    return 0;
}
