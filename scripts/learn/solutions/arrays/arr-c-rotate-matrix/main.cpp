#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int N;
    cin >> N;
    vector<vector<long long>> a(N, vector<long long>(N));
    for (auto &row : a)
        for (auto &v : row) cin >> v;
    for (int i = 0; i < N; i++)
        for (int j = i + 1; j < N; j++) swap(a[i][j], a[j][i]);   // transpose
    for (auto &row : a) reverse(row.begin(), row.end());           // mirror each row
    string out;
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++) {
            out += to_string(a[i][j]);
            out += (j + 1 == N ? '\n' : ' ');
        }
    cout << out;
}
