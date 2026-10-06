#include <stdio.h>

long long n, a[20], total = 0;
int k;

long long gcd(long long x, long long y) { while (y) { long long t = x % y; x = y; y = t; } return x; }

void dfs(int i, long long l, int sz) {
    if (i == k) {
        if (sz) total += (sz % 2 ? 1 : -1) * (n / l);
        return;
    }
    dfs(i + 1, l, sz);
    long long x = l / gcd(l, a[i]);
    if (x <= n / a[i]) dfs(i + 1, x * a[i], sz + 1);   /* lcm <= n: safe, else prune */
}

int main(void) {
    scanf("%lld %d", &n, &k);
    for (int i = 0; i < k; i++) scanf("%lld", &a[i]);
    dfs(0, 1, 0);
    printf("%lld\n", total);
    return 0;
}
