#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n), buf(n);
    for (auto &v : a) cin >> v;
    long long inv = 0;
    for (int w = 1; w < n; w *= 2) {                  // bottom-up merge sort
        for (int lo = 0; lo < n - w; lo += 2 * w) {
            int mid = lo + w, hi = min(lo + 2 * w, n), i = lo, j = mid, k = lo;
            while (i < mid && j < hi) {
                if (a[i] <= a[j]) buf[k++] = a[i++];
                else { inv += mid - i; buf[k++] = a[j++]; }   // a[j] jumps over the rest of the left run
            }
            while (i < mid) buf[k++] = a[i++];
            while (j < hi) buf[k++] = a[j++];
            copy(buf.begin() + lo, buf.begin() + hi, a.begin() + lo);
        }
    }
    cout << inv << "\n";
}
