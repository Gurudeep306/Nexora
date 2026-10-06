import java.io.*;
import java.util.*;

public class Main {
    static final long P = 1_000_000_007L;
    static long[] F, IF;

    static long power(long b, long e) {
        long r = 1;
        b %= P;
        while (e > 0) {
            if ((e & 1) == 1) r = r * b % P;
            b = b * b % P;
            e >>= 1;
        }
        return r;
    }

    static void buildFact(int N) {             // factorials and inverse factorials up to N
        F = new long[N + 1];
        IF = new long[N + 1];
        F[0] = 1;
        for (int i = 1; i <= N; i++) F[i] = F[i - 1] * i % P;
        IF[N] = power(F[N], P - 2);
        for (int i = N; i > 0; i--) IF[i - 1] = IF[i] * i % P;
    }

    static long C(long n, long r) {
        if (r < 0 || n < 0 || r > n) return 0;
        return F[(int) n] * IF[(int) r] % P * IF[(int) (n - r)] % P;
    }

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in), 1 << 16);
        int n = Integer.parseInt(br.readLine().trim());
        String s = br.readLine().trim();
        buildFact(n);
        int[] cnt = new int[26];
        for (int i = 0; i < n; i++) cnt[s.charAt(i) - 'a']++;
        long ans = F[n];
        for (int c = 0; c < 26; c++) ans = ans * IF[cnt[c]] % P;   // divide by k_c!
        System.out.println(ans);
    }
}
