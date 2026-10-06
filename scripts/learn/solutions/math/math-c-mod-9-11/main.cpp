#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t;
    cin >> t;
    string s, out;
    while (t--) {
        cin >> s;
        long long sum = 0, alt = 0;
        int n = s.size();
        for (int i = 0; i < n; i++) {
            int d = s[n - 1 - i] - '0';          // i = power of 10
            sum += d;
            alt += (i % 2 == 0) ? d : -d;         // 10 ≡ -1 (mod 11)
        }
        out += to_string(sum % 9) + ' ' + to_string(((alt % 11) + 11) % 11) + '\n';
    }
    cout << out;
}
