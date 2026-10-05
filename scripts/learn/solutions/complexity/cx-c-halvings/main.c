#include <stdio.h>

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        unsigned long long n;
        int steps = 0;
        scanf("%llu", &n);
        while (n > 1) { n /= 2; steps++; }        /* exact integer halving */
        printf("%d\n", steps);
    }
    return 0;
}
