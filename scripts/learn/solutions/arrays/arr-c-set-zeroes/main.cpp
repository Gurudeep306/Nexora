#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int R, C;
    cin >> R >> C;
    vector<vector<long long>> M(R, vector<long long>(C));
    for (auto &row : M)
        for (auto &v : row) cin >> v;
    bool row0 = false, col0 = false;
    for (int j = 0; j < C; j++) if (M[0][j] == 0) row0 = true;
    for (int i = 0; i < R; i++) if (M[i][0] == 0) col0 = true;
    for (int i = 1; i < R; i++)
        for (int j = 1; j < C; j++)
            if (M[i][j] == 0) M[i][0] = M[0][j] = 0;          // flags in row 0 / column 0
    for (int i = 1; i < R; i++)
        for (int j = 1; j < C; j++)
            if (M[i][0] == 0 || M[0][j] == 0) M[i][j] = 0;
    if (row0) for (int j = 0; j < C; j++) M[0][j] = 0;        // the flag row/column last
    if (col0) for (int i = 0; i < R; i++) M[i][0] = 0;
    string out;
    for (int i = 0; i < R; i++)
        for (int j = 0; j < C; j++) {
            out += to_string(M[i][j]);
            out += (j + 1 == C ? '\n' : ' ');
        }
    cout << out;
}
