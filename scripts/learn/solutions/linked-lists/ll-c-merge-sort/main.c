#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

/* slow ends at index ceil(n/2)-1; guard makes a 2-node list split 1+1 */
static struct Node *split_middle(struct Node *head) {
    struct Node *slow = head, *fast = head->next;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    struct Node *second = slow->next;
    slow->next = NULL;   /* the cut */
    return second;
}

static struct Node *merge(struct Node *a, struct Node *b) {
    struct Node dummy = {0, NULL}, *t = &dummy;
    while (a && b) {
        if (a->v <= b->v) { t->next = a; a = a->next; }
        else              { t->next = b; b = b->next; }
        t = t->next;
    }
    t->next = a ? a : b;
    return dummy.next;
}

static struct Node *merge_sort(struct Node *head) {
    if (!head || !head->next) return head;
    struct Node *second = split_middle(head);
    struct Node *l = merge_sort(head);
    struct Node *r = merge_sort(second);
    return merge(l, r);
}

int main(void) {
    int n;
    scanf("%d", &n);
    struct Node *head = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v;
        nd->next = NULL;
        if (!head) head = nd; else tail->next = nd;
        tail = nd;
    }
    head = merge_sort(head);
    if (!head) { puts("EMPTY"); return 0; }
    int first = 1;
    for (struct Node *t = head; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", t->v);
    }
    putchar('\n');
    return 0;
}
