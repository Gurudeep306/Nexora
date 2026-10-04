#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int cnt[101] = {0};
    for (int i = 0; i < n; i++) {
        int v;
        cin >> v;
        cnt[v]++;                      // count every value once
    }
    int q;
    cin >> q;
    string out;
    while (q--) {
        int x;
        cin >> x;
        out += to_string(cnt[x]);
        out += '\n';
    }
    cout << out;
}
