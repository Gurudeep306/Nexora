#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<int> a(n);
    for (auto &v : a) cin >> v;
    int lo = 0, mid = 0, hi = n - 1;              // [0,lo)=0  [lo,mid)=1  [mid,hi]=?  (hi,n)=2
    while (mid <= hi) {
        if (a[mid] == 0) swap(a[lo++], a[mid++]);
        else if (a[mid] == 1) mid++;
        else swap(a[mid], a[hi--]);               // the new a[mid] is still unknown
    }
    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 == n ? '\n' : ' ');
}
