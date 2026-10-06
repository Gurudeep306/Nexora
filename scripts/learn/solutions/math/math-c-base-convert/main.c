#include <stdio.h>
#include <string.h>

char t[1105], out[6000];
int d[1105];

int main(void) {
    const char *DIG = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    int a, b;
    scanf("%d %d %1100s", &a, &b, t);
    int L = strlen(t), k = 0, start = 0;
    for (int i = 0; i < L; i++) d[i] = (t[i] >= '0' && t[i] <= '9') ? t[i] - '0' : t[i] - 'A' + 10;
    while (start < L && d[start] == 0) start++;
    while (start < L) {
        int rem = 0;
        for (int i = start; i < L; i++) {               /* long division by b in base a */
            int cur = rem * a + d[i];
            d[i] = cur / b;
            rem = cur % b;
        }
        out[k++] = DIG[rem];
        while (start < L && d[start] == 0) start++;
    }
    if (k == 0) out[k++] = '0';
    for (int i = k - 1; i >= 0; i--) putchar(out[i]);
    putchar('\n');
    return 0;
}
