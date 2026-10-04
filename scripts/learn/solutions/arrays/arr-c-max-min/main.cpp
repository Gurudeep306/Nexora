#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long first;
    cin >> first;
    long long mx = first, mn = first;     // start from a real element
    for (int i = 1; i < n; i++) {
        long long x;
        cin >> x;
        mx = max(mx, x);
        mn = min(mn, x);
    }
    cout << mx << " " << mn << "\n";
}
