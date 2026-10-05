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

    public static void main(String[] args) throws IOException {
        int T = ni();
        int[] q = new int[T];
        int N = 2;
        for (int i = 0; i < T; i++) { q[i] = ni(); N = Math.max(N, q[i]); }
        boolean[] composite = new boolean[N + 1];
        composite[0] = composite[1] = true;
        for (long i = 2; i * i <= N; i++)
            if (!composite[(int) i])
                for (long j = i * i; j <= N; j += i) composite[(int) j] = true;   // O(N log log N)
        int[] pi = new int[N + 1];
        for (int x = 1; x <= N; x++) pi[x] = pi[x - 1] + (composite[x] ? 0 : 1); // prefix counts
        StringBuilder sb = new StringBuilder();
        for (int x : q) sb.append(pi[x]).append('\n');
        System.out.print(sb);
    }
}
