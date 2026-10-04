#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    long long c1 = 0, c2 = 1;
    int k1 = 0, k2 = 0;
    for (long long x : a) {
        if (x == c1) k1++;
        else if (x == c2) k2++;
        else if (k1 == 0) { c1 = x; k1 = 1; }
        else if (k2 == 0) { c2 = x; k2 = 1; }
        else { k1--; k2--; }                     // discard a triple of different values
    }
    long long n1 = count(a.begin(), a.end(), c1), n2 = count(a.begin(), a.end(), c2);
    vector<long long> res;
    if (3 * n1 > n) res.push_back(c1);           // verify both candidates
    if (c2 != c1 && 3 * n2 > n) res.push_back(c2);
    sort(res.begin(), res.end());
    if (res.empty()) cout << -1 << "\n";
    else for (size_t i = 0; i < res.size(); i++) cout << res[i] << (i + 1 == res.size() ? '\n' : ' ');
}
