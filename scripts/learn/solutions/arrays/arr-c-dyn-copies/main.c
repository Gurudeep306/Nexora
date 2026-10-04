#include <stdio.h>

int main(void) {
    unsigned long long n, cap = 1, copies = 0;
    scanf("%llu", &n);
    while (cap < n) {            /* full before a push: copy everything, double */
        copies += cap;
        cap *= 2;
    }
    printf("%llu %llu\n", copies, cap);
    return 0;
}
