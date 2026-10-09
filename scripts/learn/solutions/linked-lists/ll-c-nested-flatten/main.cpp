#include <bits/stdc++.h>
using namespace std;

// Flatten a nested integer structure with an explicit stack.
// Items are encoded by index so no pointers are invalidated by vector growth:
// lists[i] is a nested list; lists[0] is the root.
struct EItem { bool isList; int v; int listIdx; };

int main() {
    string s;
    getline(cin, s);

    // ---- parse into nested lists with an explicit parse stack (no recursion) ----
    vector<vector<EItem>> lists;
    lists.emplace_back();                 // lists[0] = root
    vector<int> pstack;
    pstack.push_back(0);
    for (size_t i = 0; i < s.size(); i++) {
        char c = s[i];
        if (c == '[') {
            lists.emplace_back();
            int idx = (int)lists.size() - 1;
            lists[pstack.back()].push_back(EItem{true, 0, idx});
            pstack.push_back(idx);
        } else if (c == ']') {
            pstack.pop_back();
        } else if (c == ',' || isspace((unsigned char)c)) {
            // separator
        } else {
            // start of an integer, possibly negative
            size_t j = i;
            while (j < s.size() && (isdigit((unsigned char)s[j]) || s[j] == '-')) j++;
            lists[pstack.back()].push_back(EItem{false, stoi(s.substr(i, j - i)), -1});
            i = j - 1;
        }
    }

    // ---- flatten: pop an item; integer -> output; list -> push children in REVERSE ----
    vector<pair<int,int>> stk;            // (listIdx, childPos)
    for (int k = (int)lists[0].size() - 1; k >= 0; k--) stk.push_back({0, k});
    string out;
    while (!stk.empty()) {
        pair<int,int> top = stk.back();
        stk.pop_back();
        const EItem& it = lists[top.first][top.second];
        if (it.isList) {
            const vector<EItem>& kids = lists[it.listIdx];
            for (int k = (int)kids.size() - 1; k >= 0; k--) stk.push_back({it.listIdx, k});
        } else {
            if (!out.empty()) out += ' ';
            out += to_string(it.v);
        }
    }
    if (out.empty()) puts("EMPTY");
    else puts(out.c_str());
    return 0;
}
