import java.io.*;
import java.util.*;

public class Main {
    static DataInputStream in = new DataInputStream(new BufferedInputStream(System.in, 1 << 16));
    static long nl() throws IOException {
        int r = in.read();
        while (r != '-' && (r < '0' || r > '9')) r = in.read();
        boolean neg = r == '-';
        if (neg) r = in.read();
        long x = 0;
        while (r >= '0' && r <= '9') { x = x * 10 + (r - '0'); r = in.read(); }
        return neg ? -x : x;
    }
    static int ni() throws IOException { return (int) nl(); }
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
        buildFact(1_000_000);
        int t = ni();
        StringBuilder sb = new StringBuilder();
        while (t-- > 0) {
            long n = nl(), r = nl();
            sb.append(C(n, r)).append('\n');
        }
        System.out.print(sb);
    }
}
