#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    long long T;
    scanf("%d %lld", &n, &T);
    long long *a = malloc(sizeof(long long) * n);
    for (int k = 0; k < n; k++) scanf("%lld", &a[k]);
    int i = 0, j = n - 1, found = 0;
    while (i < j) {
        long long s = a[i] + a[j];
        if (s == T) { found = 1; break; }
        if (s < T) i++;
        else j--;
    }
    printf("%s\n", found ? "YES" : "NO");
    free(a);
    return 0;
}
