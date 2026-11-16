var a = [5, 1, 4, 2, 8]
let n = a.count
for i in 0..<n {
    for j in 0..<(n - 1 - i) {
        if a[j] > a[j + 1] { a.swapAt(j, j + 1) }
    }
}
print(a.map { String($0) }.joined(separator: " "))
