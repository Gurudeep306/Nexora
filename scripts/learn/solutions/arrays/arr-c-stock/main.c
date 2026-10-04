#include <stdio.h>

int main(void) {
    int n;
    long long low, x, best = 0;
    scanf("%d %lld", &n, &low);
    for (int i = 1; i < n; i++) {
        scanf("%lld", &x);
        if (x - low > best) best = x - low;   /* sell today, bought at the cheapest day so far */
        if (x < low) low = x;
    }
    printf("%lld\n", best);
    return 0;
}
