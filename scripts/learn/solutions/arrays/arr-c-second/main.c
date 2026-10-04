#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long first = -1, second = -1;  /* values are >= 0, so -1 means "none" */
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        if (x > first) {
            second = first;
            first = x;
        } else if (x < first && x > second) {
            second = x;
        }
    }
    printf("%lld\n", second);
    return 0;
}
