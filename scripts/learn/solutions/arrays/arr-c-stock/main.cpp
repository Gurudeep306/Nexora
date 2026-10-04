#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long low, x, best = 0;
    cin >> low;
    for (int i = 1; i < n; i++) {
        cin >> x;
        best = max(best, x - low);       // sell today, bought at the cheapest day so far
        low = min(low, x);
    }
    cout << best << "\n";
}
