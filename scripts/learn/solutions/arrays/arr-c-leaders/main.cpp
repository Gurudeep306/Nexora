#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    vector<long long> leaders;
    long long mx = LLONG_MIN;                     // max of everything to the right
    for (int i = n - 1; i >= 0; i--)
        if (a[i] > mx) { leaders.push_back(a[i]); mx = a[i]; }
    reverse(leaders.begin(), leaders.end());      // found right-to-left
    for (size_t k = 0; k < leaders.size(); k++)
        cout << leaders[k] << (k + 1 == leaders.size() ? '\n' : ' ');
}
