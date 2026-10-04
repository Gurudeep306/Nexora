#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    long long n;
    cin >> n;
    long long sum = 0;
    for (long long i = 0; i < n; i++) {
        long long x;
        cin >> x;
        sum += x;
    }
    cout << n * (n + 1) / 2 - sum << "\n";      // expected total minus actual total
}
