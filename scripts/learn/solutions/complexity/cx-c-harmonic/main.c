#include <stdio.h>

int main(void) {
    long long n, S = 0;
    scanf("%lld", &n);
    for (long long i = 1; i <= n;) {
        long long q = n / i;
        long long last = n / q;                  /* every i' in [i, last] has quotient q */
        S += q * (last - i + 1);
        i = last + 1;
    }
    printf("%lld\n", S);
    return 0;
}
