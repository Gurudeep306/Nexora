#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long x;
    cin >> x;
    const long long NEG = LLONG_MIN / 4;         // "minus infinity" that cannot overflow
    long long keep = x, del = NEG, best = x;
    for (int i = 1; i < n; i++) {
        cin >> x;
        del = max(del + x, keep);                // deleted earlier, or delete x now
        keep = max(keep + x, x);                 // plain Kadane
        best = max({best, keep, del});
    }
    cout << best << "\n";
}
