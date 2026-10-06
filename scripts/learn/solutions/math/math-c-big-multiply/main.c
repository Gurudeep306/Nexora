#include <stdio.h>
#include <string.h>

char a[2105], b[2105], out[4210];
int col[4210];

int main(void) {
    scanf("%2100s %2100s", a, b);
    int la = strlen(a), lb = strlen(b);
    for (int i = 0; i < la; i++) {
        int x = a[la - 1 - i] - '0';
        for (int j = 0; j < lb; j++) col[i + j] += x * (b[lb - 1 - j] - '0');
    }
    for (int t = 0; t + 1 < la + lb; t++) { col[t + 1] += col[t] / 10; col[t] %= 10; }
    int top = la + lb - 1, k = 0;
    while (top > 0 && col[top] == 0) top--;
    for (int t = top; t >= 0; t--) out[k++] = (char)('0' + col[t]);
    out[k] = 0;
    puts(out);
    return 0;
}
