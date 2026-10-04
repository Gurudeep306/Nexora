#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n), cand = 0;
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    int count = 0, occ = 0;
    for (int i = 0; i < n; i++) {               /* pair off different values */
        if (count == 0) cand = a[i];
        count += (a[i] == cand) ? 1 : -1;
    }
    for (int i = 0; i < n; i++) occ += (a[i] == cand);   /* verify the survivor */
    printf("%lld\n", 2LL * occ > n ? cand : -1LL);
    free(a);
    return 0;
}
