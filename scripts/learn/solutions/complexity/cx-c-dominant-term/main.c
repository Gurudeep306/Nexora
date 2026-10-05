#include <stdio.h>

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        int d, top = -1;
        long long c;
        scanf("%d", &d);
        for (int i = 0; i <= d; i++) {            /* coefficient i belongs to n^(d - i) */
            scanf("%lld", &c);
            if (c != 0 && top < 0) top = d - i;
        }
        if (top == 0) puts("Theta(1)");
        else if (top == 1) puts("Theta(n)");
        else printf("Theta(n^%d)\n", top);
    }
    return 0;
}
