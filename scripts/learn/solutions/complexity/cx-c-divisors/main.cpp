#include <bits/stdc++.h>
using namespace std;

int main() {
    long long n;
    cin >> n;
    long long cnt = 0;
    for (long long i = 1; i * i <= n; i++)
        if (n % i == 0) cnt += (i * i == n) ? 1 : 2;   // the pair (i, n/i)
    cout << cnt << "\n";
}
