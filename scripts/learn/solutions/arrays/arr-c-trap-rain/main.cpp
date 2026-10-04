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
    long long lmax = 0, rmax = 0, water = 0;
    while (i <= j) {
        if (lmax <= rmax) {                       // the left side's level is already certain
            lmax = max(lmax, h[i]);
            water += lmax - h[i++];
        } else {                                  // the right side's level is certain
            rmax = max(rmax, h[j]);
            water += rmax - h[j--];
        }
    }
    cout << water << "\n";
}
