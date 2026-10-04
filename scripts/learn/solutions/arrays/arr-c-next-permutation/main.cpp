#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    int i = n - 2;
    while (i >= 0 && a[i] >= a[i + 1]) i--;            // pivot: last ascent
    if (i >= 0) {
        int j = n - 1;
        while (a[j] <= a[i]) j--;                      // rightmost value bigger than the pivot
        swap(a[i], a[j]);
    }
    reverse(a.begin() + i + 1, a.end());               // smallest arrangement of the suffix
    for (int k = 0; k < n; k++) cout << a[k] << (k + 1 == n ? '\n' : ' ');
}
