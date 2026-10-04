#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int R, C, q;
    cin >> R >> C >> q;
    vector<vector<long long>> P(R + 1, vector<long long>(C + 1, 0));
    for (int i = 0; i < R; i++)
        for (int j = 0; j < C; j++) {
            long long v;
            cin >> v;
            P[i + 1][j + 1] = v + P[i][j + 1] + P[i + 1][j] - P[i][j];
        }
    string out;
    while (q--) {
        int r1, c1, r2, c2;
        cin >> r1 >> c1 >> r2 >> c2;
        long long s = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
        out += to_string(s);
        out += '\n';
    }
    cout << out;
}
