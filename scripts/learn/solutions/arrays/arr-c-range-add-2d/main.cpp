#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int R, C, m;
    cin >> R >> C >> m;
    vector<vector<long long>> M(R, vector<long long>(C)), D(R + 1, vector<long long>(C + 1, 0));
    for (auto &row : M)
        for (auto &v : row) cin >> v;
    while (m--) {
        int r1, c1, r2, c2;
        long long v;
        cin >> r1 >> c1 >> r2 >> c2 >> v;
        D[r1][c1] += v;                          // four corner marks
        D[r1][c2 + 1] -= v;
        D[r2 + 1][c1] -= v;
        D[r2 + 1][c2 + 1] += v;
    }
    string out;
    for (int i = 0; i < R; i++)
        for (int j = 0; j < C; j++) {
            if (i) D[i][j] += D[i - 1][j];       // 2D prefix sum of the marks
            if (j) D[i][j] += D[i][j - 1];
            if (i && j) D[i][j] -= D[i - 1][j - 1];
            out += to_string(M[i][j] + D[i][j]);
            out += (j + 1 == C ? '\n' : ' ');
        }
    cout << out;
}
