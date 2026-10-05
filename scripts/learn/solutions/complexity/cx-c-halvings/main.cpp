#include <bits/stdc++.h>
using namespace std;

int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        unsigned long long n;
        scanf("%llu", &n);
        int steps = 0;
        while (n > 1) { n /= 2; steps++; }        // exact integer halving
        printf("%d\n", steps);
    }
}
