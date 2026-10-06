#include <bits/stdc++.h>
using namespace std;

int main() {
    int t;
    scanf("%d", &t);
    while (t--) {
        long long n;
        scanf("%lld", &n);
        string line;
        for (long long d = 2; d * d <= n; d++) {     // n shrinks as factors are removed
            if (n % d) continue;
            int e = 0;
            while (n % d == 0) { n /= d; e++; }
            line += to_string(d) + '^' + to_string(e) + ' ';
        }
        if (n > 1) line += to_string(n) + "^1 ";      // leftover is prime
        line.pop_back();
        puts(line.c_str());
    }
}
