#include <bits/stdc++.h>
using namespace std;

bool isPrime(long long n) {
    if (n < 2) return false;
    if (n % 2 == 0) return n == 2;
    for (long long d = 3; d * d <= n; d += 2)       // a factor <= sqrt(n) must exist
        if (n % d == 0) return false;
    return true;
}

int main() {
    int t;
    scanf("%d", &t);
    while (t--) {
        long long n;
        scanf("%lld", &n);
        puts(isPrime(n) ? "YES" : "NO");
    }
}
