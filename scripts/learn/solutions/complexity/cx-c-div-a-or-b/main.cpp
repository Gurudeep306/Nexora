#include <bits/stdc++.h>
using namespace std;

int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n, a, b;
        scanf("%lld %lld %lld", &n, &a, &b);
        long long l = a / __gcd(a, b) * b;             // lcm <= 1e18, divide first
        printf("%lld\n", n / a + n / b - n / l);       // inclusion-exclusion
    }
}
