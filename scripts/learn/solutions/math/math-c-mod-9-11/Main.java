import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in), 1 << 16);
        int t = Integer.parseInt(br.readLine().trim());
        StringBuilder sb = new StringBuilder();
        while (t-- > 0) {
            String s = br.readLine().trim();
            int n = s.length();
            long sum = 0, alt = 0;
            for (int i = 0; i < n; i++) {
                int d = s.charAt(n - 1 - i) - '0';
                sum += d;
                alt += (i % 2 == 0) ? d : -d;
            }
            sb.append(sum % 9).append(' ').append(Math.floorMod(alt, 11)).append('\n');
        }
        System.out.print(sb);
    }
}
