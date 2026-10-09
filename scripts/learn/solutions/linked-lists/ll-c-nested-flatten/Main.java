import java.io.*;
import java.util.*;

public class Main {
    // Items are encoded by index so nothing is invalidated by growth:
    // lists.get(i) is a nested list; lists.get(0) is the root.
    static class Item {
        boolean isList;
        int v;
        int listIdx;
        Item(boolean isList, int v, int listIdx) { this.isList = isList; this.v = v; this.listIdx = listIdx; }
    }

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String s = br.readLine().trim();

        // ---- parse into nested lists with an explicit parse stack (no recursion) ----
        ArrayList<ArrayList<Item>> lists = new ArrayList<>();
        lists.add(new ArrayList<Item>());          // root
        int[] pstack = new int[s.length() + 2];
        int ptop = 0;
        pstack[ptop++] = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '[') {
                lists.add(new ArrayList<Item>());
                int idx = lists.size() - 1;
                lists.get(pstack[ptop - 1]).add(new Item(true, 0, idx));
                pstack[ptop++] = idx;
            } else if (c == ']') {
                ptop--;
            } else if (c == ',') {
                // separator
            } else {
                // start of an integer, possibly negative
                int j = i;
                while (j < s.length() && (Character.isDigit(s.charAt(j)) || s.charAt(j) == '-')) j++;
                lists.get(pstack[ptop - 1]).add(new Item(false, Integer.parseInt(s.substring(i, j)), -1));
                i = j - 1;
            }
        }

        // ---- flatten: pop an item; integer -> output; list -> push children in REVERSE ----
        int[][] stk = new int[s.length() * 2 + 2][2];   // (listIdx, childPos)
        int top = 0;
        ArrayList<Item> root = lists.get(0);
        for (int k = root.size() - 1; k >= 0; k--) { stk[top][0] = 0; stk[top][1] = k; top++; }
        StringBuilder sb = new StringBuilder();
        while (top > 0) {
            top--;
            Item it = lists.get(stk[top][0]).get(stk[top][1]);
            if (it.isList) {
                ArrayList<Item> kids = lists.get(it.listIdx);
                for (int k = kids.size() - 1; k >= 0; k--) { stk[top][0] = it.listIdx; stk[top][1] = k; top++; }
            } else {
                if (sb.length() > 0) sb.append(' ');
                sb.append(it.v);
            }
        }
        System.out.println(sb.length() > 0 ? sb.toString() : "EMPTY");
    }
}
