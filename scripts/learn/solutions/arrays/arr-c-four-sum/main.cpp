#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long T;
    cin >> n >> T;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    sort(a.begin(), a.end());
    long long count = 0;
    for (int i = 0; i < n; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;
        for (int j = i + 1; j < n; j++) {
            if (j > i + 1 && a[j] == a[j - 1]) continue;
            int lo = j + 1, hi = n - 1;
            while (lo < hi) {
                long long s = a[i] + a[j] + a[lo] + a[hi];      // 64-bit: up to 4e9
                if (s < T) lo++;
                else if (s > T) hi--;
                else {
                    count++;
                    lo++;
                    while (lo < hi && a[lo] == a[lo - 1]) lo++;
                    hi--;
                }
            }
        }
    }
    cout << count << "\n";
}
