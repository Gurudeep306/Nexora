#include <stdio.h>
#define MOD 1000000007LL
#define INV4 250000002LL

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        scanf("%lld", &n);
        printf("%lld\n", n % MOD * ((n - 1) % MOD) % MOD * INV4 % MOD);
    }
    return 0;
}
