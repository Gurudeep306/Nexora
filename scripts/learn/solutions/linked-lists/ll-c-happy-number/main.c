#include <stdio.h>

static int f(int x) {           /* sum of squares of digits */
    int s = 0;
    while (x) { int d = x % 10; s += d * d; x /= 10; }
    return s;
}

int main(void) {
    int T;
    scanf("%d", &T);
    char buf[2048];
    int len = 0;
    while (T--) {
        int x;
        scanf("%d", &x);
        /* Floyd on the implicit digit-square chain */
        int slow = x;
        int fast = f(x);
        while (fast != 1 && slow != fast) {
            slow = f(slow);
            fast = f(f(fast));
        }
        if (len + 2 > (int)sizeof(buf)) {
            fwrite(buf, 1, len, stdout);
            len = 0;
        }
        buf[len++] = (fast == 1) ? '1' : '0';
        buf[len++] = '\n';
    }
    fwrite(buf, 1, len, stdout);
    return 0;
}
