#include <stdio.h>

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        int f[3], g[3], c = 0;
        scanf("%d %d %d %d %d %d", &f[0], &f[1], &f[2], &g[0], &g[1], &g[2]);
        for (int k = 0; k < 3 && c == 0; k++)     /* p, then a, then b */
            c = (f[k] > g[k]) - (f[k] < g[k]);
        puts(c < 0 ? "<" : c > 0 ? ">" : "=");
    }
    return 0;
}
