import java.io.*;

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

    static boolean isPrime(long n) {
        if (n < 2) return false;
        if (n < 4) return true;                   // 2 and 3
        if (n % 2 == 0 || n % 3 == 0) return false;
        for (long i = 5; i * i <= n; i += 6)      // candidates 6k - 1 and 6k + 1
            if (n % i == 0 || n % (i + 2) == 0) return false;
        return true;
    }

    public static void main(String[] args) throws IOException {
        int T = ni();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) sb.append(isPrime(nl()) ? "YES\n" : "NO\n");
        System.out.print(sb);
    }
}
