#include <bits/stdc++.h>
using namespace std;

int main() {
    int T;
    scanf("%d", &T);
    string out;
    while (T--) {
        int d;
        scanf("%d", &d);
        int top = -1;
        for (int i = 0; i <= d; i++) {            // coefficient i belongs to n^(d - i)
            long long c;
            scanf("%lld", &c);
            if (c != 0 && top < 0) top = d - i;   // first non-zero = dominant power
        }
        out += top == 0 ? "Theta(1)" : top == 1 ? "Theta(n)" : "Theta(n^" + to_string(top) + ")";
        out += '\n';
    }
    fputs(out.c_str(), stdout);
}
