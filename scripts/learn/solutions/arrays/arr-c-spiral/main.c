#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int R, C;
    scanf("%d %d", &R, &C);
    long long *a = malloc(sizeof(long long) * R * C);
    for (int i = 0; i < R * C; i++) scanf("%lld", &a[i]);
    int top = 0, bottom = R - 1, left = 0, right = C - 1, printed = 0, total = R * C;
#define OUT(v) printf("%lld%c", (v), ++printed == total ? '\n' : ' ')
    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) OUT(a[top * C + j]);
        top++;
        for (int i = top; i <= bottom; i++) OUT(a[i * C + right]);
        right--;
        if (top <= bottom) {                       /* a bottom row is left */
            for (int j = right; j >= left; j--) OUT(a[bottom * C + j]);
            bottom--;
        }
        if (left <= right) {                       /* a left column is left */
            for (int i = bottom; i >= top; i--) OUT(a[i * C + left]);
            left++;
        }
    }
    free(a);
    return 0;
}
