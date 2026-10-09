## Intuition
"Where is the linked list?" There isn't one in the input — the list IS the digit-square chain $x \to f(x) \to f(f(x)) \to \dots$ where $f(x)$ = sum of the squares of $x$'s digits, and each number's `next` pointer is $f$ applied to it. The question "does repeatedly applying f reach 1?" is exactly "does this implicit list end at the fixed point 1, or enter a cycle that never contains 1?" — cycle detection wearing a disguise. Whenever a problem asks "does this process terminate?", think Floyd. The seen-set method works but costs $O(\text{cycle})$ memory; Floyd costs **nothing** — two integers.

## Approach
```cpp
int f(int x) {                    // sum of squares of digits
    int s = 0;
    while (x) { int d = x % 10; s += d * d; x /= 10; }
    return s;
}

bool happy(int x) {
    int slow = x;
    int fast = f(x);              // hare one step ahead
    while (fast != 1 && slow != fast) {
        slow = f(slow);           // tortoise: 1 application
        fast = f(f(fast));        // hare: 2 applications
    }
    return fast == 1;             // reached the fixed point 1 => happy
}
```
The orbit either hits 1 (then stays: $f(1) = 1$) or, by the argument below, loops. Floyd distinguishes the two: if the hare ever shows 1, the chain reaches 1; if the two meet at some other value, they're stuck in a cycle that cannot contain 1 (1 is a fixed point — a cycle through it would have to leave it, impossible).

## Why it works
**Orbits are bounded:** for $x$ with $d$ digits, $f(x) \le 81d$, while $x \ge 10^{d-1}$. For $d \ge 4$, $81d < 10^{d-1}$, so every number $\ge 1000$ maps to something strictly smaller; orbits therefore eventually live below 1000. **So they must cycle:** only finitely many values (≤ 1000) are visited forever, and by the pigeonhole principle some value repeats — from the first repeat onward the chain is a cycle. Now Floyd's standard argument applies: inside the cycle the gap between hare and tortoise shrinks by 1 per round, so they meet if and only if the orbit is eventually cyclic *without* hitting 1 first. Checking `fast == 1` decides: 1 is absorbing ($f(1)=1$), so the hare sits on 1 forever exactly when the chain reaches it.

## Complexity
$O(\log x)$ per f-application (digits), and the orbit enters the below-1000 region in $O(\log \log x)$ steps with cycles of length ≤ a few dozen — effectively $O(\log x)$ per query, $O(T \log x)$ overall. $O(1)$ space. The seen-set version: same time, $O(\text{cycle})$ space — correct but not the teaching point.

## Pitfalls
- Using a hash set "because it's easier": correct, but the interview point of this problem is that Floyd needs zero memory.
- Loop condition `while (slow != fast)` started with `slow = fast = x`: false immediately, always reports happy. Give the hare a head start (`fast = f(x)`) or use a do/while.
- Forgetting the `fast != 1` check: on a happy number the chain reaches 1 and then tortoise and hare BOTH sit on 1 forever — they "meet", and you'd report unhappy. 1 is a fixed point; treat it as the terminating exception.
- Digit loop bugs: `f(0)` should be 0 (the input guarantees $x \ge 1$, but orbits can pass through... actually never below 1 for positive x — still, write the loop so it terminates).
- $x \le 10^9$ fits an int everywhere; the largest f-value on the way is $81 \cdot 10 = 810$, so no overflow worries — but a BigInt-in-JS reflex here is harmless, plain numbers are exact.
