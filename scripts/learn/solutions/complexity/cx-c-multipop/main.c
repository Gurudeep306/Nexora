#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int q;
    scanf("%d", &q);
    long long *st = malloc(sizeof(long long) * (q + 1));
    int top = 0;
    for (int i = 0; i < q; i++) {
        int t;
        long long x;
        scanf("%d %lld", &t, &x);
        if (t == 1) { st[top++] = x; continue; }
        long long sum = 0, m = x < top ? x : top;    /* never loop k times */
        while (m-- > 0) sum += st[--top];
        printf("%lld\n", sum);
    }
    free(st);
    return 0;
}
