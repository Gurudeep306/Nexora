#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

int main(void) {
    int n, pos;
    scanf("%d %d", &n, &pos);
    struct Node **nodes = malloc(sizeof(struct Node *) * (n > 0 ? n : 1));
    struct Node *head = NULL;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        nodes[i] = malloc(sizeof(struct Node));
        nodes[i]->v = v;
        nodes[i]->next = NULL;
        if (i) nodes[i - 1]->next = nodes[i]; else head = nodes[i];
    }
    if (n && pos >= 0) nodes[n - 1]->next = nodes[pos];   /* build the cycle */

    /* Act 1: Floyd detect — tortoise 1, hare 2 */
    struct Node *slow = head, *fast = head;
    int met = 0;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) { met = 1; break; }
    }
    if (!met) { printf("0\n"); return 0; }

    /* Act 2: freeze slow, walk p around one full lap */
    struct Node *p = slow->next;
    int C = 1;
    while (p != slow) {
        p = p->next;
        C++;
    }
    printf("%d\n", C);
    return 0;
}
