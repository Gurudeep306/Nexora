#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    unordered_map<long long, int> first;
    first.reserve(n * 2);
    for (int i = 1; i <= n; i++) {
        long long x;
        scanf("%lld", &x);
        first.emplace(x, i);                          // emplace keeps the earliest position
    }
    int q;
    scanf("%d", &q);
    string out;
    while (q--) {
        long long x;
        scanf("%lld", &x);
        auto it = first.find(x);
        out += to_string(it == first.end() ? n : it->second);
        out += '\n';
    }
    fputs(out.c_str(), stdout);
}
