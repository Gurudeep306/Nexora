#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long x;
    cin >> x;
    long long cur = x, best = x;                 // best subarray ending here / anywhere
    for (int i = 1; i < n; i++) {
        cin >> x;
        cur = max(x, cur + x);                   // extend, or start fresh at x
        best = max(best, cur);
    }
    cout << best << "\n";
}
