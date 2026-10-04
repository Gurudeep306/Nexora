#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *h = malloc(sizeof(long long) * n);
    for (int k = 0; k < n; k++) scanf("%lld", &h[k]);
    int i = 0, j = n - 1;
    long long lmax = 0, rmax = 0, water = 0;
    while (i <= j) {
        if (lmax <= rmax) {                       /* the left side's level is already certain */
            if (h[i] > lmax) lmax = h[i];
            water += lmax - h[i++];
        } else {
            if (h[j] > rmax) rmax = h[j];
            water += rmax - h[j--];
        }
    }
    printf("%lld\n", water);
    free(h);
    return 0;
}
