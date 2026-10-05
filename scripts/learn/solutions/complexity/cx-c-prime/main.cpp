#include <bits/stdc++.h>
using namespace std;

bool isPrime(long long n) {
    if (n < 2) return false;
    if (n < 4) return true;                       // 2 and 3
    if (n % 2 == 0 || n % 3 == 0) return false;
    for (long long i = 5; i * i <= n; i += 6)     // candidates 6k - 1 and 6k + 1
        if (n % i == 0 || n % (i + 2) == 0) return false;
    return true;
}

int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        scanf("%lld", &n);
        puts(isPrime(n) ? "YES" : "NO");
    }
}
