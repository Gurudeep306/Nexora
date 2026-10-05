#include <bits/stdc++.h>
using namespace std;

int main() {
    long long n;
    cin >> n;
    long long S = 0;
    for (long long i = 1; i <= n;) {
        long long q = n / i;
        long long last = n / q;                  // every i' in [i, last] has quotient q
        S += q * (last - i + 1);
        i = last + 1;
    }
    cout << S << "\n";
}
