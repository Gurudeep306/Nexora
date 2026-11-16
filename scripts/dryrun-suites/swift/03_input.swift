let n = Int(readLine()!)!
let a = readLine()!.split(separator: " ").map { Int($0)! }
var best = 0, cur = 0
for v in a {
    cur = max(v, cur + v)
    best = max(best, cur)
}
print(n, best)
