#include <bits/stdc++.h>
using namespace std;

int main() {
    int q;
    scanf("%d", &q);
    vector<long long> st;
    st.reserve(q);
    string out;
    while (q--) {
        int t;
        long long x;
        scanf("%d %lld", &t, &x);
        if (t == 1) { st.push_back(x); continue; }
        long long sum = 0;
        long long m = min<long long>(x, st.size());   // never loop k times
        while (m--) { sum += st.back(); st.pop_back(); }
        out += to_string(sum);
        out += '\n';
    }
    fputs(out.c_str(), stdout);
}
