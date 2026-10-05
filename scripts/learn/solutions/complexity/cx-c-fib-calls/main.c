#include <stdio.h>

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        int n;
        scanf("%d", &n);
        long long a = 0, b = 1;                       /* F(0), F(1) */
        for (int i = 0; i <= n; i++) { long long c = a + b; a = b; b = c; }
        printf("%lld\n", 2 * a - 1);                  /* C(n) = 2F(n + 1) - 1 */
    }
    return 0;
}
