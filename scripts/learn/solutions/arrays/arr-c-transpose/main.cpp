#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int R, C;
    cin >> R >> C;
    vector<vector<long long>> a(R, vector<long long>(C));
    for (auto &row : a)
        for (auto &v : row) cin >> v;
    string out;
    for (int i = 0; i < C; i++)                  // output row i = input column i
        for (int j = 0; j < R; j++) {
            out += to_string(a[j][i]);
            out += (j + 1 == R ? '\n' : ' ');
        }
    cout << out;
}
