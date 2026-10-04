#include <stdio.h>

int main(void) {
    int n;
    long long x, cur, best;
    scanf("%d %lld", &n, &x);
    cur = best = x;                              /* best subarray ending here / anywhere */
    for (int i = 1; i < n; i++) {
        scanf("%lld", &x);
        cur = (cur + x > x) ? cur + x : x;       /* extend, or start fresh at x */
        if (cur > best) best = cur;
    }
    printf("%lld\n", best);
    return 0;
}
