#include <bits/stdc++.h>
using namespace std;

int main() {
    string a, b;
    cin >> a >> b;
    int la = a.size(), lb = b.size();
    vector<int> col(la + lb, 0);
    for (int i = 0; i < la; i++)
        for (int j = 0; j < lb; j++)
            col[i + j] += (a[la - 1 - i] - '0') * (b[lb - 1 - j] - '0');   // carry later
    for (int t = 0; t + 1 < la + lb; t++) { col[t + 1] += col[t] / 10; col[t] %= 10; }
    int top = la + lb - 1;
    while (top > 0 && col[top] == 0) top--;
    string out;
    for (int t = top; t >= 0; t--) out += char('0' + col[t]);
    cout << out << '\n';
}
