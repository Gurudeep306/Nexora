#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m;
    cin >> n >> m;
    vector<long long> A(n), B(m), out;
    for (auto &v : A) cin >> v;
    for (auto &v : B) cin >> v;
    out.reserve(n + m);
    int i = 0, j = 0;
    while (i < n && j < m) out.push_back(A[i] <= B[j] ? A[i++] : B[j++]);   // ties: A first
    while (i < n) out.push_back(A[i++]);
    while (j < m) out.push_back(B[j++]);
    string s;
    for (size_t k = 0; k < out.size(); k++) {
        s += to_string(out[k]);
        s += (k + 1 == out.size() ? '\n' : ' ');
    }
    cout << s;
}
