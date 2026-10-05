#include <bits/stdc++.h>
using namespace std;

int main() {
    const int I = 62, J = 40;                         // 2^61 > 1e18, 3^39 > 1e18
    int T;
    scanf("%d", &T);
    static long long v[I + 1][J + 1], D[I + 1][J + 1];
    while (T--) {
        long long n;
        scanf("%lld", &n);
        for (int i = 0; i <= I; i++)
            for (int j = 0; j <= J; j++)              // v[i][j] = floor(n / (2^i 3^j))
                v[i][j] = i == 0 && j == 0 ? n : (j > 0 ? v[i][j - 1] / 3 : v[i - 1][j] / 2);
        for (int i = I; i >= 0; i--)
            for (int j = J; j >= 0; j--)
                D[i][j] = v[i][j] == 0 || i == I || j == J ? 0 : D[i + 1][j] + D[i][j + 1] + 1;
        printf("%lld\n", D[0][0]);
    }
}
