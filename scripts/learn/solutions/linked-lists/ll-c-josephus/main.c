#include <stdio.h>

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        int n;
        long long k;
        scanf("%d %lld", &n, &k);
        /* O(n) recurrence: seat(1)=0; seat(m) = (seat(m-1)+k) mod m */
        long long seat = 0;
        for (int m = 2; m <= n; m++)
            seat = (seat + k) % m;
        printf("%lld\n", seat + 1);   /* 1-based survivor */
    }
    return 0;
}
