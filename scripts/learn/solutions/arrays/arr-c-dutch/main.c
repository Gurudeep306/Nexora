#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int *a = malloc(sizeof(int) * n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int lo = 0, mid = 0, hi = n - 1, t;           /* [0,lo)=0 [lo,mid)=1 [mid,hi]=? (hi,n)=2 */
    while (mid <= hi) {
        if (a[mid] == 0) { t = a[lo]; a[lo++] = a[mid]; a[mid++] = t; }
        else if (a[mid] == 1) mid++;
        else { t = a[hi]; a[hi--] = a[mid]; a[mid] = t; }   /* a[mid] still unknown */
    }
    for (int i = 0; i < n; i++) printf("%d%c", a[i], i + 1 == n ? '\n' : ' ');
    free(a);
    return 0;
}
