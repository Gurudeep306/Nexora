#include <stdio.h>

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        unsigned long long n;
        int L = 0;
        scanf("%llu", &n);
        while ((n >> L) != 0) L++;                    /* bit length of n */
        printf("%llu\n", (1ULL << L) - 1);            /* 1 + 2 + ... + 2^(L-1) */
    }
    return 0;
}
