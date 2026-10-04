#include <stdio.h>
#include <limits.h>

int main(void) {
    int n;
    long long x;
    scanf("%d %lld", &n, &x);
    const long long NEG = LLONG_MIN / 4;         /* "minus infinity" that cannot overflow */
    long long keep = x, del = NEG, best = x;
    for (int i = 1; i < n; i++) {
        scanf("%lld", &x);
        long long nd = (del + x > keep) ? del + x : keep;   /* deleted earlier, or delete x now */
        keep = (keep + x > x) ? keep + x : x;               /* plain Kadane */
        del = nd;
        if (keep > best) best = keep;
        if (del > best) best = del;
    }
    printf("%lld\n", best);
    return 0;
}
