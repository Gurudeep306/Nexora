#include <bits/stdc++.h>
using namespace std;

int main() {
    unsigned long long n;
    cin >> n;
    unsigned long long cap = 1, copies = 0;
    while (cap < n) {            // full before a push: copy everything, double
        copies += cap;
        cap *= 2;
    }
    cout << copies << " " << cap << "\n";
}
