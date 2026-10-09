#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

static struct Node *reverseList(struct Node *head) {
    struct Node *prev = NULL, *cur = head;
    while (cur) {
        struct Node *nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
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

    int ok = 1;
    if (head) {
        /* split: next-next guard leaves slow at the LAST node of the first half */
        struct Node *slow = head, *fast = head;
        while (fast->next && fast->next->next) {
            slow = slow->next;
            fast = fast->next->next;
        }
        struct Node *secondHead = slow->next;   /* floor(n/2) nodes AFTER slow */
        slow->next = NULL;                      /* cut */
        secondHead = reverseList(secondHead);

        struct Node *p = head;
        for (struct Node *q = secondHead; q; q = q->next, p = p->next) {
            if (p->v != q->v) { ok = 0; break; }
        }

        slow->next = reverseList(secondHead);   /* RESTORE on both exits */
    }
    puts(ok ? "1" : "0");
    return 0;
}
