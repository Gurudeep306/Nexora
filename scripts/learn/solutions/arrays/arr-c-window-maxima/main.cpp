#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    deque<int> dq;                                   // indices, values decreasing front → back
    string out;
    for (int i = 0; i < n; i++) {
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();   // dominated forever
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();                     // slid out of the window
        if (i >= k - 1) {
            out += to_string(a[dq.front()]);
            out += (i + 1 == n ? '\n' : ' ');
        }
    }
    cout << out;
}
