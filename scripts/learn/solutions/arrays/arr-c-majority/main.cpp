#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    long long cand = 0;
    int count = 0;
    for (long long x : a) {                      // pair off different values
        if (count == 0) cand = x;
        count += (x == cand) ? 1 : -1;
    }
    int occ = 0;
    for (long long x : a) occ += (x == cand);    // verify the survivor
    cout << (2LL * occ > n ? cand : -1) << "\n";
}
