#include <stdio.h>
#include <stdlib.h>
#define P 1000000007LL

static long long power(long long b, long long e) {
    long long r = 1;
    b %= P;
    while (e > 0) {
        if (e & 1) r = r * b % P;
        b = b * b % P;
        e >>= 1;
    }
    return r;
}

static long long *F, *IF;
static void build_fact(int N) {               /* factorials and inverse factorials up to N */
    F = malloc(sizeof(long long) * (N + 1));
    IF = malloc(sizeof(long long) * (N + 1));
    F[0] = 1;
    for (int i = 1; i <= N; i++) F[i] = F[i - 1] * i % P;
    IF[N] = power(F[N], P - 2);
    for (int i = N; i > 0; i--) IF[i - 1] = IF[i] * i % P;
}
static long long C(long long n, long long r) {
    if (r < 0 || n < 0 || r > n) return 0;
    return F[n] * IF[r] % P * IF[n - r] % P;
}

static char s[200005];

int main(void) {
    int n;
    if (scanf("%d %200004s", &n, s) != 2) return 0;
    build_fact(n);
    long long cnt[26] = {0};
    for (int i = 0; i < n; i++) cnt[s[i] - 'a']++;
    long long ans = F[n];
    for (int c = 0; c < 26; c++) ans = ans * IF[cnt[c]] % P;   /* divide by k_c! */
    printf("%lld\n", ans);
    return 0;
}
