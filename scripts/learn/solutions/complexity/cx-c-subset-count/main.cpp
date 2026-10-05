#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long T;
    scanf("%d %lld", &n, &T);
    vector<long long> sums;
    sums.reserve(1 << n);
    sums.push_back(0);
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        size_t k = sums.size();
        for (size_t j = 0; j < k; j++) sums.push_back(sums[j] + x);   // subsets that take x
    }
    printf("%lld\n", (long long)count(sums.begin(), sums.end(), T));
}
