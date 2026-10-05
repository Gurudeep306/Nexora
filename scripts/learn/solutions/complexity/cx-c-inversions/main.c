#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n), *buf = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    long long inv = 0;
    for (int w = 1; w < n; w *= 2) {                  /* bottom-up merge sort */
        for (int lo = 0; lo < n - w; lo += 2 * w) {
            int mid = lo + w, hi = lo + 2 * w < n ? lo + 2 * w : n, i = lo, j = mid, k = lo;
            while (i < mid && j < hi) {
                if (a[i] <= a[j]) buf[k++] = a[i++];
                else { inv += mid - i; buf[k++] = a[j++]; }   /* a[j] jumps over the rest of the left run */
            }
            while (i < mid) buf[k++] = a[i++];
            while (j < hi) buf[k++] = a[j++];
            memcpy(a + lo, buf + lo, sizeof(long long) * (hi - lo));
        }
    }
    printf("%lld\n", inv);
    free(a);
    free(buf);
    return 0;
}
