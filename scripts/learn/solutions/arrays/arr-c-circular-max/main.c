#include <stdio.h>

int main(void) {
    int n;
    long long x, total, curMax, bestMax, curMin, bestMin;
    scanf("%d %lld", &n, &x);
    total = curMax = bestMax = curMin = bestMin = x;
    for (int i = 1; i < n; i++) {
        scanf("%lld", &x);
        total += x;
        curMax = (curMax + x > x) ? curMax + x : x;      /* best non-wrapping */
        if (curMax > bestMax) bestMax = curMax;
        curMin = (curMin + x < x) ? curMin + x : x;      /* worst middle piece */
        if (curMin < bestMin) bestMin = curMin;
    }
    long long wrap = total - bestMin;
    printf("%lld\n", bestMax < 0 ? bestMax : (wrap > bestMax ? wrap : bestMax));
    return 0;
}
