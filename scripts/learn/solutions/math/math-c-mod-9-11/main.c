#include <stdio.h>
#include <string.h>

static char s[200005];

int main(void) {
    int t;
    scanf("%d", &t);
    while (t--) {
        scanf("%200004s", s);
        int n = (int)strlen(s);
        long long sum = 0, alt = 0;
        for (int i = 0; i < n; i++) {
            int d = s[n - 1 - i] - '0';
            sum += d;
            alt += (i % 2 == 0) ? d : -d;
        }
        printf("%lld %lld\n", sum % 9, ((alt % 11) + 11) % 11);
    }
    return 0;
}
