#include <bits/stdc++.h>
using namespace std;

static inline int f(int x) {          // sum of squares of digits
    int s = 0;
    while (x) { int d = x % 10; s += d * d; x /= 10; }
    return s;
}

int main() {
    int T;
    scanf("%d", &T);
    string out;
    while (T--) {
        int x;
        scanf("%d", &x);
        // Floyd on the implicit digit-square chain
        int slow = x;
        int fast = f(x);
        while (fast != 1 && slow != fast) {
            slow = f(slow);
            fast = f(f(fast));
        }
        out += (fast == 1 ? '1' : '0');
        out += '\n';
    }
    fwrite(out.data(), 1, out.size(), stdout);
    return 0;
}
