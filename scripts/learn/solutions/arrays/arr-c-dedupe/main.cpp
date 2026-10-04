#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    int w = 1;                                  // a[0..w-1] = distinct values so far
    for (int r = 1; r < n; r++)
        if (a[r] != a[w - 1]) a[w++] = a[r];
    string out = to_string(w) + "\n";
    for (int i = 0; i < w; i++) {
        out += to_string(a[i]);
        out += (i + 1 == w ? '\n' : ' ');
    }
    cout << out;
}
