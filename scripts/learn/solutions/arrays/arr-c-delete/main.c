#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, p;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    scanf("%d", &p);
    for (int i = p; i + 1 < n; i++) a[i] = a[i + 1];  /* shift left, from the hole */
    n--;
    if (n == 0) printf("EMPTY\n");
    else for (int i = 0; i < n; i++) printf("%lld%c", a[i], i + 1 == n ? '\n' : ' ');
    free(a);
    return 0;
}
