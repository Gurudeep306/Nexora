import java.io.*;
import java.math.BigInteger;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());
        int a = Integer.parseInt(st.nextToken()), b = Integer.parseInt(st.nextToken());
        String t = br.readLine().trim();
        int[] d = new int[t.length()];
        for (int i = 0; i < d.length; i++) d[i] = Character.digit(t.charAt(i), 36);
        StringBuilder out = new StringBuilder();
        int start = 0;
        while (start < d.length && d[start] == 0) start++;
        while (start < d.length) {
            int rem = 0;
            for (int i = start; i < d.length; i++) {   // long division by b in base a
                int cur = rem * a + d[i];
                d[i] = cur / b;
                rem = cur % b;
            }
            out.append(Character.toUpperCase(Character.forDigit(rem, 36)));
            while (start < d.length && d[start] == 0) start++;
        }
        if (out.length() == 0) out.append('0');
        System.out.println(out.reverse());
    }
}
