#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int q, t, head = 0, tail = 0;
    scanf("%d", &q);
    int *a = malloc(sizeof(int) * q);             /* live queue is a[head..tail) */
    while (q--) {
        scanf("%d", &t);
        if (t == 1) scanf("%d", &a[tail++]);
        else printf("%d\n", a[head++]);           /* O(1): nothing moves */
    }
    free(a);
    return 0;
}
