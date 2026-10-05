#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long T;
    cin >> n >> T;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    sort(a.begin(), a.end());
    long long count = 0;
    int i = 0, j = n - 1;
    while (i < j) {
        long long s = a[i] + a[j];
        if (s < T) i++;
        else if (s > T) j--;
        else if (a[i] == a[j]) {                  // every pair inside [i..j] works
            long long k = j - i + 1;
            count += k * (k - 1) / 2;
            break;
        } else {                                  // count the runs of equal values on both sides
            long long ci = 1, cj = 1;
            while (i + 1 < j && a[i + 1] == a[i]) { i++; ci++; }
            while (j - 1 > i && a[j - 1] == a[j]) { j--; cj++; }
            count += ci * cj;
            i++;
            j--;
        }
    }
    cout << count << "\n";
}
