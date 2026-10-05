#include <stdio.h>
#include <stdlib.h>

/* all subset sums of a[0..k), sorted, by repeated merging; returns 2^k values */
static long long *sorted_sums(const long long *a, int k) {
    long long *s = malloc(sizeof(long long) << k), *t = malloc(sizeof(long long) << k), *tmp;
    int m = 1;
    s[0] = 0;
    for (int i = 0; i < k; i++) {
        int p = 0, q = 0, w = 0;
        while (p < m || q < m) {                  /* merge s with s + a[i] */
            if (q == m || (p < m && s[p] <= s[q] + a[i])) t[w++] = s[p++];
            else t[w++] = s[q++] + a[i];
        }
        tmp = s; s = t; t = tmp;
        m *= 2;
    }
    free(t);
    return s;
}

int main(void) {
    int n;
    long long T, cnt = 0;
    scanf("%d %lld", &n, &T);
    long long a[40];
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    int h = n / 2;
    long long *L = sorted_sums(a, h), *R = sorted_sums(a + h, n - h);
    long long nl = 1LL << h, i = 0, j = (1LL << (n - h)) - 1;
    while (i < nl && j >= 0) {
        long long s = L[i] + R[j];
        if (s < T) i++;
        else if (s > T) j--;
        else {                                    /* multiply the runs of equal values */
            long long ci = 0, cj = 0, x = L[i], y = R[j];
            while (i < nl && L[i] == x) { i++; ci++; }
            while (j >= 0 && R[j] == y) { j--; cj++; }
            cnt += ci * cj;
        }
    }
    printf("%lld\n", cnt);
    free(L); free(R);
    return 0;
}
