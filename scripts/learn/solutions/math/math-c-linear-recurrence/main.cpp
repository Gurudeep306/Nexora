#include <bits/stdc++.h>
using namespace std;
const long long M = 1000000007LL;
typedef vector<vector<long long>> Mat;

Mat mul(const Mat &A, const Mat &B) {
    int k = A.size();
    Mat C(k, vector<long long>(k, 0));
    for (int i = 0; i < k; i++)
        for (int t = 0; t < k; t++) {
            if (!A[i][t]) continue;
            for (int j = 0; j < k; j++) C[i][j] = (C[i][j] + A[i][t] * B[t][j]) % M;   // reduce every step
        }
    return C;
}

int main() {
    int k;
    long long n;
    cin >> k >> n;
    vector<long long> c(k), a(k);
    for (auto &x : c) cin >> x;
    for (auto &x : a) cin >> x;
    if (n < k) { cout << a[n] << '\n'; return 0; }
    Mat C(k, vector<long long>(k, 0)), R(k, vector<long long>(k, 0));
    for (int j = 0; j < k; j++) C[0][j] = c[j];
    for (int i = 1; i < k; i++) C[i][i - 1] = 1;           // shift the window
    for (int i = 0; i < k; i++) R[i][i] = 1;
    for (long long e = n - k + 1; e > 0; e >>= 1) {
        if (e & 1) R = mul(R, C);
        C = mul(C, C);
    }
    long long ans = 0;
    for (int j = 0; j < k; j++) ans = (ans + R[0][j] * a[k - 1 - j]) % M;   // v0 = (a_{k-1},...,a_0)
    cout << ans << '\n';
}
