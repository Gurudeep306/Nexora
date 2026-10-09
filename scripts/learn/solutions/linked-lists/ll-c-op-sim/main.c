#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Doubly linked list with head AND tail pointers: end ops are O(1). */
struct Node { int v; struct Node *prev, *next; };

static struct Node *head = NULL, *tail = NULL;
static int len = 0;

static int readInt(void) {
    int c = getchar(), s = 1, x = 0;
    while (c != '-' && (c < '0' || c > '9')) c = getchar();
    if (c == '-') { s = -1; c = getchar(); }
    while (c >= '0' && c <= '9') { x = x * 10 + (c - '0'); c = getchar(); }
    return s * x;
}

static void readWord(char *w) {
    int c = getchar();
    while (c <= 32 && c != EOF) c = getchar();
    while (c > 32 && c != EOF) *w++ = (char)c, c = getchar();
    *w = '\0';
}

static void pushFront(int v) {
    struct Node *nd = malloc(sizeof(struct Node));
    nd->v = v; nd->prev = NULL; nd->next = head;
    if (head) head->prev = nd; else tail = nd;
    head = nd;
    len++;
}
static void pushBack(int v) {
    struct Node *nd = malloc(sizeof(struct Node));
    nd->v = v; nd->prev = tail; nd->next = NULL;
    if (tail) tail->next = nd; else head = nd;
    tail = nd;
    len++;
}
static void popFront(void) {
    struct Node *nd = head;
    head = head->next;
    if (head) head->prev = NULL; else tail = NULL;
    free(nd);
    len--;
}
static void popBack(void) {
    struct Node *nd = tail;
    tail = tail->prev;
    if (tail) tail->next = NULL; else head = NULL;
    free(nd);
    len--;
}
static struct Node *at(int i) {
    struct Node *cur;
    int s;
    if (i <= len / 2) {
        cur = head;
        for (s = 0; s < i; s++) cur = cur->next;
    } else {
        cur = tail;
        for (s = len - 1; s > i; s--) cur = cur->prev;
    }
    return cur;
}

int main(void) {
    int q = readInt();
    char op[16];
    for (int t = 0; t < q; t++) {
        readWord(op);
        if (op[1] == 'u') {                 /* push_front / push_back */
            int v = readInt();
            if (op[5] == 'f') pushFront(v); else pushBack(v);
        } else if (op[1] == 'o') {          /* pop_front / pop_back */
            if (op[4] == 'f') popFront(); else popBack();
        } else if (op[0] == 'i') {          /* insert i v */
            int i = readInt(), v = readInt();
            struct Node *cur, *nd;
            if (i == 0) { pushFront(v); continue; }
            if (i == len) { pushBack(v); continue; }
            cur = at(i);
            nd = malloc(sizeof(struct Node));
            nd->v = v; nd->prev = cur->prev; nd->next = cur;
            cur->prev->next = nd;
            cur->prev = nd;
            len++;
        } else {                            /* erase i */
            int i = readInt();
            struct Node *cur;
            if (i == 0) { popFront(); continue; }
            if (i == len - 1) { popBack(); continue; }
            cur = at(i);
            cur->prev->next = cur->next;
            cur->next->prev = cur->prev;
            free(cur);
            len--;
        }
    }

    if (!head) { puts("EMPTY"); return 0; }
    {
        static char outbuf[3000000];
        int p = 0, first = 1;
        for (struct Node *t = head; t; t = t->next) {
            if (!first) outbuf[p++] = ' ';
            first = 0;
            p += sprintf(outbuf + p, "%d", t->v);
        }
        outbuf[p++] = '\n';
        outbuf[p] = '\0';
        fputs(outbuf, stdout);
    }
    return 0;
}
