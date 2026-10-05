#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int q;
    scanf("%d", &q);
    long long *in = malloc(sizeof(long long) * (q + 1));
    long long *out = malloc(sizeof(long long) * (q + 1));
    int ti = 0, to = 0;
    long long moves = 0;
    for (int i = 0; i < q; i++) {
        int t;
        scanf("%d", &t);
        if (t == 1) {
            scanf("%lld", &in[ti++]);
        } else {
            if (to == 0)                              /* each element moves at most once */
                while (ti > 0) { out[to++] = in[--ti]; moves++; }
            printf("%lld\n", out[--to]);
        }
    }
    printf("%lld\n", moves);
    free(in);
    free(out);
    return 0;
}
