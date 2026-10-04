#include <stdio.h>
#include <stdlib.h>
#include <limits.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n), *lead = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    int cnt = 0;
    long long mx = LLONG_MIN;                     /* max of everything to the right */
    for (int i = n - 1; i >= 0; i--)
        if (a[i] > mx) { lead[cnt++] = a[i]; mx = a[i]; }
    for (int k = cnt - 1; k >= 0; k--) printf("%lld%c", lead[k], k == 0 ? '\n' : ' ');
    free(a);
    free(lead);
    return 0;
}
