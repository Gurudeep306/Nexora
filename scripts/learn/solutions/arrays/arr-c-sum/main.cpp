#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long total = 0;          // 64-bit: the sum can reach 2e14
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        total += x;
    }
    cout << total << "\n";
}
