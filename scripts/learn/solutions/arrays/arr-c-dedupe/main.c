#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    int w = 1;                                 /* a[0..w-1] = distinct values so far */
    for (int r = 1; r < n; r++)
        if (a[r] != a[w - 1]) a[w++] = a[r];
    printf("%d\n", w);
    for (int i = 0; i < w; i++) printf("%lld%c", a[i], i + 1 == w ? '\n' : ' ');
    free(a);
    return 0;
}
