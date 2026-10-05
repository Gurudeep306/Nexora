#include <bits/stdc++.h>
using namespace std;

int main() {
    int q;
    scanf("%d", &q);
    vector<long long> in, out;
    long long moves = 0;
    string res;
    while (q--) {
        int t;
        scanf("%d", &t);
        if (t == 1) {
            long long x;
            scanf("%lld", &x);
            in.push_back(x);
        } else {
            if (out.empty())                          // each element moves at most once
                while (!in.empty()) { out.push_back(in.back()); in.pop_back(); moves++; }
            res += to_string(out.back());
            res += '\n';
            out.pop_back();
        }
    }
    res += to_string(moves);
    res += '\n';
    fputs(res.c_str(), stdout);
}
