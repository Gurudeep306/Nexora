#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long first = -1, second = -1;   // values are >= 0, so -1 means "none"
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        if (x > first) {
            second = first;
            first = x;
        } else if (x < first && x > second) {
            second = x;
        }
    }
    cout << second << "\n";
}
