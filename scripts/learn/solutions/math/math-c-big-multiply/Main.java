import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String a = br.readLine().trim(), b = br.readLine().trim();
        int la = a.length(), lb = b.length();
        int[] col = new int[la + lb];
        for (int i = 0; i < la; i++) {
            int x = a.charAt(la - 1 - i) - '0';
            for (int j = 0; j < lb; j++) col[i + j] += x * (b.charAt(lb - 1 - j) - '0');
        }
        for (int t = 0; t + 1 < la + lb; t++) { col[t + 1] += col[t] / 10; col[t] %= 10; }
        int top = la + lb - 1;
        while (top > 0 && col[top] == 0) top--;
        StringBuilder sb = new StringBuilder();
        for (int t = top; t >= 0; t--) sb.append((char) ('0' + col[t]));
        System.out.println(sb);
    }
}
