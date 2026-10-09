#include <bits/stdc++.h>
using namespace std;

int main() {
    int T;
    scanf("%d", &T);
    string out;
    while (T--) {
        int n;
        long long k;
        scanf("%d%lld", &n, &k);
        // O(n) recurrence: seat(1)=0; seat(m) = (seat(m-1)+k) mod m
        long long seat = 0;
        for (int m = 2; m <= n; m++)
            seat = (seat + k) % m;
        out += to_string(seat + 1);   // 1-based survivor
        out += '\n';
    }
    fputs(out.c_str(), stdout);
    return 0;
}
