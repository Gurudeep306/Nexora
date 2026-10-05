#include <stdio.h>

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n, b;
        int d = 1;
        scanf("%lld %lld", &n, &b);
        while (n >= b) { n /= b; d++; }               /* strip one base-b digit */
        printf("%d\n", d);
    }
    return 0;
}
