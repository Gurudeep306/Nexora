#include <bits/stdc++.h>
using namespace std;

int main() {
    int a, b;
    string t;
    cin >> a >> b >> t;
    const string DIG = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    vector<int> d;
    for (char c : t) d.push_back(isdigit(c) ? c - '0' : c - 'A' + 10);
    string out;
    size_t start = 0;                                  // skip leading zeros
    while (start < d.size() && d[start] == 0) start++;
    while (start < d.size()) {
        int rem = 0;
        for (size_t i = start; i < d.size(); i++) {    // long division by b in base a
            int cur = rem * a + d[i];
            d[i] = cur / b;
            rem = cur % b;
        }
        out += DIG[rem];
        while (start < d.size() && d[start] == 0) start++;
    }
    if (out.empty()) out = "0";
    reverse(out.begin(), out.end());
    cout << out << '\n';
}
