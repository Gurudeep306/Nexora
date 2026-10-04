#include <stdio.h>

int main(void) {
    int n, q, v;
    int cnt[101] = {0};
    scanf("%d", &n);
    for (int i = 0; i < n; i++) {
        scanf("%d", &v);
        cnt[v]++;                       /* count every value once */
    }
    scanf("%d", &q);
    while (q--) {
        scanf("%d", &v);
        printf("%d\n", cnt[v]);
    }
    return 0;
}
