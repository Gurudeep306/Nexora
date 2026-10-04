#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    int w = 0;
    for (int r = 0; r < n; r++)
        if (a[r] != 0) a[w++] = a[r];          /* keep non-zeros, in order */
    while (w < n) a[w++] = 0;                  /* the rest are zeros */
    for (int i = 0; i < n; i++) printf("%lld%c", a[i], i + 1 == n ? '\n' : ' ');
    free(a);
    return 0;
}
