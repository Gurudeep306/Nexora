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

    /* Phase 1: Floyd detect — tortoise 1, hare 2 */
    struct Node *slow = head, *fast = head;
    int met = 0;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) { met = 1; break; }
    }
    if (!met) { printf("-1\n"); return 0; }

    /* Phase 2: restart at head, both walk 1 step — they meet at the entrance */
    struct Node *p = head;
    while (p != slow) {
        p = p->next;
        slow = slow->next;
    }
    int idx = -1;
    for (int i = 0; i < n; i++) {
        if (nodes[i] == p) { idx = i; break; }
    }
    printf("%d\n", idx);
    return 0;
}
