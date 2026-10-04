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
    int q;
    cin >> q;
    string out;
    while (q--) {
        long long x;
        cin >> x;
        int i = 0, j = C - 1;                       // top-right corner
        bool found = false;
        while (i < R && j >= 0) {
            if (M[i][j] == x) { found = true; break; }
            if (M[i][j] > x) j--;                   // the whole column is too big
            else i++;                               // the whole row is too small
        }
        out += found ? "YES\n" : "NO\n";
    }
    cout << out;
}
