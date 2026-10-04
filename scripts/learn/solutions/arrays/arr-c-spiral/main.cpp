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
    vector<long long> out;
    int top = 0, bottom = R - 1, left = 0, right = C - 1;
    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) out.push_back(a[top][j]);
        top++;
        for (int i = top; i <= bottom; i++) out.push_back(a[i][right]);
        right--;
        if (top <= bottom) {                       // a bottom row is left
            for (int j = right; j >= left; j--) out.push_back(a[bottom][j]);
            bottom--;
        }
        if (left <= right) {                       // a left column is left
            for (int i = bottom; i >= top; i--) out.push_back(a[i][left]);
            left++;
        }
    }
    string s;
    for (size_t k = 0; k < out.size(); k++) {
        s += to_string(out[k]);
        s += (k + 1 == out.size() ? '\n' : ' ');
    }
    cout << s;
}
