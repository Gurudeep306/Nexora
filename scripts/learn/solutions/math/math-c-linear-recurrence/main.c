#include <stdio.h>
#include <string.h>
#define M 1000000007LL

static int k;

static void mul(long long A[10][10], long long B[10][10], long long out[10][10]) {
    long long C[10][10];
    memset(C, 0, sizeof C);
    for (int i = 0; i < k; i++)
        for (int t = 0; t < k; t++) {
            if (!A[i][t]) continue;
            for (int j = 0; j < k; j++) C[i][j] = (C[i][j] + A[i][t] * B[t][j]) % M;
        }
    memcpy(out, C, sizeof C);
}

int main(void) {
    long long n, c[10], a[10];
    if (scanf("%d %lld", &k, &n) != 2) return 0;
    for (int i = 0; i < k; i++) scanf("%lld", &c[i]);
    for (int i = 0; i < k; i++) scanf("%lld", &a[i]);
    if (n < k) { printf("%lld\n", a[n]); return 0; }
    long long C[10][10] = {{0}}, R[10][10] = {{0}};
    for (int j = 0; j < k; j++) C[0][j] = c[j];
    for (int i = 1; i < k; i++) C[i][i - 1] = 1;
    for (int i = 0; i < k; i++) R[i][i] = 1;
    for (long long e = n - k + 1; e > 0; e >>= 1) {
        if (e & 1) mul(R, C, R);
        mul(C, C, C);
    }
    long long ans = 0;
    for (int j = 0; j < k; j++) ans = (ans + R[0][j] * a[k - 1 - j]) % M;
    printf("%lld\n", ans);
    return 0;
}
