#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n + 1);          // one spare slot for the new value
    for (int i = 0; i < n; i++) cin >> a[i];
    int p;
    long long x;
    cin >> p >> x;
    for (int i = n; i > p; i--) a[i] = a[i - 1];   // shift right, from the end
    a[p] = x;
    for (int i = 0; i <= n; i++) cout << a[i] << (i == n ? '\n' : ' ');
}
