#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long mx1 = LLONG_MIN, mx2 = LLONG_MIN, mn1 = LLONG_MAX, mn2 = LLONG_MAX;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        if (x > mx1) { mx2 = mx1; mx1 = x; } else if (x > mx2) mx2 = x;
        if (x < mn1) { mn2 = mn1; mn1 = x; } else if (x < mn2) mn2 = x;
    }
    cout << max(mx1 * mx2, mn1 * mn2) << "\n";   // two largest, or two most negative
}
