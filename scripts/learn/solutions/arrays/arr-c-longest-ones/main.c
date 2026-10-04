#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, k;
    scanf("%d %d", &n, &k);
    int *a = malloc(sizeof(int) * (n > 0 ? n : 1));
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int lo = 0, zeros = 0, best = 0;
    for (int hi = 0; hi < n; hi++) {
        if (a[hi] == 0) zeros++;
        while (zeros > k) {                       /* too many zeros to flip: shrink */
            if (a[lo] == 0) zeros--;
            lo++;
        }
        if (hi - lo + 1 > best) best = hi - lo + 1;
    }
    printf("%d\n", best);
    free(a);
    return 0;
}
