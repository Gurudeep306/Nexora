#include <bits/stdc++.h>
using namespace std;

// all subset sums of a[lo..hi), in sorted order, by repeated merging
static vector<long long> sortedSums(const vector<long long> &a, int lo, int hi) {
    vector<long long> s{0}, t;
    for (int i = lo; i < hi; i++) {
        t.resize(2 * s.size());
        size_t p = 0, q = 0, k = 0, m = s.size();
        while (p < m || q < m) {                  // merge s with s + a[i]
            if (q == m || (p < m && s[p] <= s[q] + a[i])) t[k++] = s[p++];
            else t[k++] = s[q++] + a[i];
        }
        swap(s, t);
    }
    return s;
}

int main() {
    int n;
    long long T;
    scanf("%d %lld", &n, &T);
    vector<long long> a(n);
    for (auto &v : a) scanf("%lld", &v);
    vector<long long> L = sortedSums(a, 0, n / 2), R = sortedSums(a, n / 2, n);
    long long cnt = 0;
    long long i = 0, j = (long long)R.size() - 1;
    while (i < (long long)L.size() && j >= 0) {
        long long s = L[i] + R[j];
        if (s < T) i++;
        else if (s > T) j--;
        else {                                    // multiply the runs of equal values
            long long ci = 0, cj = 0, x = L[i], y = R[j];
            while (i < (long long)L.size() && L[i] == x) { i++; ci++; }
            while (j >= 0 && R[j] == y) { j--; cj++; }
            cnt += ci * cj;
        }
    }
    printf("%lld\n", cnt);
}
