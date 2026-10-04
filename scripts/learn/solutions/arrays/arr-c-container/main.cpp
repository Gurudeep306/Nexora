#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> h(n);
    for (auto &v : h) cin >> v;
    int i = 0, j = n - 1;
    long long best = 0;
    while (i < j) {
        best = max(best, (long long)(j - i) * min(h[i], h[j]));
        if (h[i] < h[j]) i++;            // the shorter wall can never do better
        else j--;
    }
    cout << best << "\n";
}
