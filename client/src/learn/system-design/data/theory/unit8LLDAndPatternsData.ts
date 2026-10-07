import type { TheoryChapter } from '../../types'

export const UNIT_8_CHAPTERS: TheoryChapter[] = [
  {
    id: 'ch-49',
    unitId: 'unit-8',
    unitTitle: 'Low-Level Design (LLD), OOP & Concurrency',
    chapterNumber: 49,
    title: 'SOLID Principles: Deep Architectural Rationale & Anti-Patterns',
    readingTimeMin: 16,
    summary:
      'Mastering object-oriented design foundations: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion with concrete refactoring examples.',
    coreConcepts: [
      'SRP (Single Responsibility): A class should have one, and only one, reason to change (Robert C. Martin). Separate business logic from I/O and persistence.',
      'OCP (Open/Closed): Open for extension, closed for modification. Implement via polymorphism and Strategy patterns instead of nested if/switch statements.',
      'LSP (Liskov Substitution): Subtypes must be substitutable for their base types without altering program correctness (Barbara Liskov). The classic Square-Rectangle anti-pattern.',
      'ISP (Interface Segregation): Clients should not be forced to depend on methods they do not use. Prefer small, focused interfaces.',
      'DIP (Dependency Inversion): High-level modules should not depend on low-level modules; both should depend on abstractions.',
    ],
    deepContentMarkdown: `### The Foundations of Clean Software: SOLID

While High-Level Design (HLD) focuses on servers, caches, and databases, **Low-Level Design (LLD)** dictates how clean, maintainable, and extensible your codebase remains over years of engineering iterations.

---

### 1. Single Responsibility Principle (SRP)
> *"A class should have only one reason to change."*

* **The Anti-Pattern (God Class):** An \`OrderManager\` class that validates the order, computes tax, runs SQL queries against PostgreSQL, sends an email to the user, and calls Stripe API.
* **The Refactored Architecture:**
  * \`OrderValidator\`: Validates order fields and stock constraints.
  * \`TaxCalculator\`: Encapsulates tax rate calculations.
  * \`OrderRepository\`: Handles persistence to SQL.
  * \`NotificationService\`: Sends confirmation emails.
  * \`PaymentProcessor\`: Communicates with Stripe.

---

### 2. Open/Closed Principle (OCP)
> *"Software entities should be open for extension, but closed for modification."*

* **The Anti-Pattern:** A notification class with a giant \`switch\` statement:
  \`\`\`typescript
  function send(type: string, msg: string) {
    if (type === 'EMAIL') sendEmail(msg)
    else if (type === 'SMS') sendSMS(msg)
    else if (type === 'PUSH') sendPush(msg) // Modifies core class every time a new channel is added!
  }
  \`\`\`
* **The OCP Pattern:** Define a \`NotificationChannel\` interface. Adding WhatsApp notifications requires creating a new \`WhatsAppChannel\` class implementing the interface—**zero lines of existing code are touched!**

---

### 3. Liskov Substitution Principle (LSP)
> *"Subtypes must be substitutable for their base types without altering program correctness."*

* **The Classic Anti-Pattern: Square extending Rectangle.**
  * A \`Rectangle\` has \`setWidth(w)\` and \`setHeight(h)\`.
  * A \`Square\` inherits from \`Rectangle\`, but overrides \`setWidth(w)\` to set both width and height to $w$.
  * Client code assumes:
    \`\`\`java
    rect.setWidth(5);
    rect.setHeight(10);
    assert(rect.getArea() == 50); // FAILS if rect is an instance of Square!
    \`\`\`
  * The subtype violated the behavioral contract of the parent type.

---

### 4. Interface Segregation Principle (ISP)
> *"Clients should not be forced to depend upon interfaces that they do not use."*

* Instead of one "fat" \`Worker\` interface with \`code()\`, \`test()\`, \`deploy()\`, and \`designUI()\`:
* Split into focused role interfaces: \`Coder\`, \`Tester\`, \`Deployer\`, \`Designer\`.

---

### 5. Dependency Inversion Principle (DIP)
> *"High-level modules should not depend on low-level modules. Both should depend on abstractions."*

* High-level business logic (\`CheckoutService\`) must not directly instantiate \`new PostgresUserRepository()\`.
* Instead, \`CheckoutService\` depends on interface \`IUserRepository\`. The concrete implementation is injected via Dependency Injection (DI) at runtime.`,
    equationsAndMath: [
      {
        name: 'Liskov Substitution Contract Rule',
        formula: '\\forall x \\in T, \\quad P(x) \\implies P(y) \\quad \\text{where } y \\in S \\text{ and } S <: T',
        explanation: 'If property P is provable for objects of type T, then P must be true for objects of subtype S.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Strict SOLID Compliance',
        pros: ['Extremely decoupled', '100% unit-testable via mocks', 'Easy to extend without regressions'],
        cons: ['More files, interfaces, and boilerplate classes'],
        bestFor: 'Enterprise software, production codebases with multiple engineers',
      },
    ],
    interviewKeypoints: [
      'In LLD machine coding interviews, write interfaces first before implementing concrete classes.',
      'Cite the Square-Rectangle problem when asked to explain Liskov Substitution Principle.',
    ],
  },

  {
    id: 'ch-50',
    unitId: 'unit-8',
    unitTitle: 'Low-Level Design (LLD), OOP & Concurrency',
    chapterNumber: 50,
    title: 'Creational Patterns: Factory, Builder & Thread-Safe Singleton',
    readingTimeMin: 15,
    summary:
      'Object instantiation patterns: Factory Method, Abstract Factory families, Builder for complex immutability, and thread-safe Singleton with Double-Checked Locking.',
    coreConcepts: [
      'Factory Method: Defines an interface for creating an object, but lets subclasses decide which class to instantiate.',
      'Abstract Factory: Provides an interface for creating families of related or dependent objects without specifying their concrete classes.',
      'Builder Pattern: Separates the construction of a complex object from its representation, enabling step-by-step assembly and immutable objects.',
      'Thread-Safe Singleton: Double-Checked Locking pattern with volatile memory barrier to prevent instruction reordering bugs.',
    ],
    deepContentMarkdown: `### Creational Design Patterns in Low-Level Design

Creational patterns abstract the instantiation process, making systems independent of how their objects are created, composed, and represented.

---

### 1. Builder Pattern with Immutability
When an object has 10+ configuration parameters (many optional), constructor telescoping (\`new Config(a, b, null, null, c)\`) is unreadable and error-prone.

\`\`\`java
public class HttpRequest {
    private final String url;
    private final String method;
    private final Map<String, String> headers;
    private final byte[] body;

    private HttpRequest(Builder b) {
        this.url = b.url;
        this.method = b.method;
        this.headers = Collections.unmodifiableMap(b.headers);
        this.body = b.body;
    }

    public static class Builder {
        private String url;
        private String method = "GET";
        private Map<String, String> headers = new HashMap<>();
        private byte[] body;

        public Builder url(String url) { this.url = url; return this; }
        public Builder method(String method) { this.method = method; return this; }
        public Builder header(String k, String v) { headers.put(k, v); return this; }
        public Builder body(byte[] body) { this.body = body; return this; }
        public HttpRequest build() { return new HttpRequest(this); }
    }
}
\`\`\`

---

### 2. Thread-Safe Singleton with Double-Checked Locking

In multi-threaded environments, lazy initialization of a Singleton requires **Double-Checked Locking** with a \`volatile\` barrier:

\`\`\`java
public class DatabaseConnectionPool {
    // CRUCIAL: volatile prevents CPU instruction reordering!
    private static volatile DatabaseConnectionPool instance;

    private DatabaseConnectionPool() { /* Initialize pool */ }

    public static DatabaseConnectionPool getInstance() {
        if (instance == null) { // Check 1 (no lock overhead)
            synchronized (DatabaseConnectionPool.class) {
                if (instance == null) { // Check 2 (under lock)
                    instance = new DatabaseConnectionPool();
                }
            }
        }
        return instance;
    }
}
\`\`\`

#### Why \`volatile\` is Mandatory:
Without \`volatile\`, the JVM compiler and CPU can reorder instructions during \`instance = new DatabaseConnectionPool()\`:
1. Allocate memory.
2. Assign pointer to \`instance\` (non-null!).
3. Execute constructor.
If Thread B reads \`instance\` after Step 2 but before Step 3 finishes, Thread B receives an **uninitialized, corrupted object**! \`volatile\` inserts a memory fence that guarantees Step 3 completes before Step 2 is visible.`,
    equationsAndMath: [
      {
        name: 'Double-Checked Locking Memory Barrier',
        formula: '\\text{volatile} \\implies \\text{StoreStore} \\land \\text{StoreLoad} \\text{ barriers inserted}',
        explanation: 'Enforces happens-before relationship between constructor completion and reference publication.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Double-Checked Locking Singleton',
        pros: ['Lazy initialization', 'Zero synchronization overhead after initial creation'],
        cons: ['Requires volatile keyword; subtle concurrency edge cases'],
        bestFor: 'Heavy resources (Database pools, thread pools)',
      },
      {
        option: 'Bill Pugh Initialization-on-Demand Holder',
        pros: ['100% thread-safe without synchronized keyword', 'JVM classloader guarantees thread safety'],
        cons: ['Static inner class idiom'],
        bestFor: 'Java standard singletons',
      },
    ],
    interviewKeypoints: [
      'Explain why the volatile keyword is strictly mandatory in Double-Checked Locking (preventing instruction reordering).',
      'Use the Builder pattern in LLD interviews whenever constructing domain objects with multiple optional parameters.',
    ],
  },

  {
    id: 'ch-51',
    unitId: 'unit-8',
    unitTitle: 'Low-Level Design (LLD), OOP & Concurrency',
    chapterNumber: 51,
    title: 'Structural Patterns: Adapter, Decorator & Proxy',
    readingTimeMin: 14,
    summary:
      'Composing classes and objects into larger structures: Adapter (interface bridging), Decorator (dynamic behavior layering), Composite, and Proxy (lazy loading, caching, rate limiting).',
    coreConcepts: [
      'Adapter: Converts the interface of a class into another interface clients expect (e.g. bridging Stripe and PayPal to a unified PaymentGateway interface).',
      'Decorator: Attaches additional responsibilities to an object dynamically (e.g. BufferedInputStream wrapping FileInputStream, LoggingDecorator wrapping Repository).',
      'Proxy: Controls access to an object, providing lazy loading, authentication, caching, or rate limiting before delegating to the real subject.',
    ],
    deepContentMarkdown: `### Structural Design Patterns

Structural patterns ease design by identifying a simple way to realize relationships among entities.

---

### 1. Adapter Pattern (Interface Bridging)
When integrating third-party APIs with incompatible method signatures:
* Internal System expects: \`PaymentGateway.charge(cents: number, currency: string)\`.
* Stripe SDK provides: \`StripeClient.createCharge(amount: number, cur: string)\`.
* PayPal SDK provides: \`PayPalClient.makePayment(dollars: float)\`.

**Solution:**
Create \`StripeAdapter\` and \`PayPalAdapter\` implementing the unified \`PaymentGateway\` interface. Business logic interacts exclusively with the adapter interface.

---

### 2. Decorator Pattern (Dynamic Behavior Layering)
Prefer composition over inheritance! Instead of creating a subclass for every combination of features (\`LoggingCompressedEncryptedFileStream\`):
Wrap objects recursively:

\`\`\`typescript
interface DataService {
  getData(): string
}

class BaseDataService implements DataService {
  getData() { return "Raw Data" }
}

class CachingDecorator implements DataService {
  constructor(private wrapped: DataService, private cache: Cache) {}
  getData() {
    return this.cache.get("key") ?? this.wrapped.getData()
  }
}

class LoggingDecorator implements DataService {
  constructor(private wrapped: DataService) {}
  getData() {
    console.log("Fetching data...")
    return this.wrapped.getData()
  }
}

// Composition: Stack decorators cleanly!
const service = new LoggingDecorator(new CachingDecorator(new BaseDataService(), cache))
\`\`\``,
    equationsAndMath: [
      {
        name: 'Decorator Combinatorial Explosion Reduction',
        formula: '\\text{Subclasses with Inheritance: } \\mathcal{O}(2^N) \\quad \\mid \\quad \\text{Classes with Decorator: } \\mathcal{O}(N)',
        explanation: 'Inheriting every combination of N features requires 2^N subclasses; Decorators achieve the same flexibility with only N classes.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Decorator Pattern',
        pros: ['Flexible runtime composition', 'Adheres to Single Responsibility Principle'],
        cons: ['Can produce deeply nested wrapper objects that are harder to debug'],
        bestFor: 'Middleware, streaming I/O, cross-cutting caching/logging',
      },
    ],
    interviewKeypoints: [
      'Highlight Java I/O (BufferedReader wrapping FileReader) as the classic canonical example of the Decorator pattern.',
      'Use the Adapter pattern when designing pluggable multi-vendor payment or cloud storage backends.',
    ],
  },

  {
    id: 'ch-52',
    unitId: 'unit-8',
    unitTitle: 'Low-Level Design (LLD), OOP & Concurrency',
    chapterNumber: 52,
    title: 'Behavioral Patterns: Strategy, Observer & State',
    readingTimeMin: 15,
    summary:
      'Object communication and algorithm swapping: Strategy (interchangeable algorithms), Observer (event pub/sub), State (finite state machines), and Chain of Responsibility.',
    coreConcepts: [
      'Strategy Pattern: Defines a family of algorithms, encapsulates each one, and makes them interchangeable at runtime (e.g. PricingStrategy: RegularPricing, SurgePricing, HolidayDiscount).',
      'Observer Pattern: Defines a one-to-many dependency between objects so that when one object changes state, all its dependents are notified automatically.',
      'State Pattern: Allows an object to alter its behavior when its internal state changes, cleanly implementing finite state machines without nested if/else statements.',
    ],
    deepContentMarkdown: `### Behavioral Design Patterns

Behavioral patterns characterize the complex control flow and division of responsibility between objects.

---

### 1. Strategy Pattern (Runtime Algorithm Swapping)
* **Problem:** In an Uber ride-pricing engine, calculation rules change dynamically based on time and location.
* **Solution:** Encapsulate pricing logic inside a \`PricingStrategy\` interface:
  * \`StandardPricingStrategy\`
  * \`SurgePricingStrategy\`
  * \`FlatRatePricingStrategy\`
* The \`Ride\` object holds a reference to a \`PricingStrategy\` and delegates \`calculatePrice(distance, duration)\` to it.

---

### 2. State Pattern (Clean Finite State Machines)
* **Problem:** An e-commerce Order transitions through states: \`Created\`, \`Paid\`, \`Shipped\`, \`Delivered\`, \`Cancelled\`.
* **The Anti-Pattern:** Every method in \`Order\` has a giant \`switch(this.state)\`.
* **The State Pattern Solution:**
  * Define an \`OrderState\` interface: \`pay()\`, \`ship()\`, \`cancel()\`.
  * Each concrete state (\`PaidState\`, \`ShippedState\`) implements valid transitions and throws exceptions for illegal operations (e.g. attempting to cancel an already-shipped order).
  * State transitions simply update the \`Order\`'s internal state pointer:
    \`\`\`java
    public void ship() {
        this.currentState.ship(this);
    }
    \`\`\``,
    equationsAndMath: [
      {
        name: 'State Transition Function',
        formula: '\\delta : \\text{State} \\times \\text{Event} \\to \\text{State}',
        explanation: 'Encapsulating transitions into discrete State classes enforces valid deterministic state machine behavior.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'State Pattern',
        pros: ['Eliminates massive nested switch statements', 'Localizes state-specific business rules'],
        cons: ['Increases number of classes'],
        bestFor: 'Order lifecycles, vending machines, workflow status tracking',
      },
    ],
    interviewKeypoints: [
      'Use the State pattern whenever an interview problem involves an entity with a lifecycle (e.g. Parking Spot states: Free, Occupied, Reserved).',
      'Use the Strategy pattern to satisfy the Open/Closed Principle when swapping calculation algorithms.',
    ],
  },

  {
    id: 'ch-53',
    unitId: 'unit-8',
    unitTitle: 'Low-Level Design (LLD), OOP & Concurrency',
    chapterNumber: 53,
    title: 'Concurrency Primitives: Mutex, Spinlock & ReadWriteLock',
    readingTimeMin: 15,
    summary:
      'Thread synchronization at the OS and CPU hardware level: Mutexes, Futexes in Linux, Spinlocks, ReentrantReadWriteLock, and Semaphores.',
    coreConcepts: [
      'Mutex (Mutual Exclusion): Kernel-managed lock. When contended, thread yields CPU and sleeps until awakened by OS scheduler.',
      'Spinlock: Busy-waits in a tight CPU loop checking lock variable. Zero context switch latency, but burns 100% CPU core power.',
      'Linux Futex (Fast Userspace Mutex): Uncontended lock acquisition takes place in user space (atomic CAS) in ~10ns; only falls back to kernel syscall when contended.',
      'ReentrantReadWriteLock: Permits multiple concurrent readers OR a single exclusive writer.',
    ],
    deepContentMarkdown: `### Hardware & OS Synchronization Primitives

Multi-threaded software must coordinate access to shared memory. Choosing the wrong primitive destroys CPU performance through context-switching overhead or lock contention.

---

### 1. Mutex vs Spinlock

* **Mutex (Sleeping Lock):**
  * When a thread fails to acquire a mutex, the OS puts the thread to sleep in a wait queue.
  * The CPU context switches to another runnable thread.
  * **Context Switch Cost:** **~1,000 to 3,000 nanoseconds** (flushes CPU registers, invalidates CPU cache lines).
  * **Best For:** Critical sections that hold locks for longer than a few microseconds (e.g. file I/O, database queries).

* **Spinlock (Busy-Waiting Lock):**
  * When a thread fails to acquire a spinlock, it does **not sleep**. It executes in a tight loop (\`while (!try_lock()) { pause; }\`) polling the atomic variable.
  * **Cost:** Burns 100% of a CPU core while waiting!
  * **Best For:** Ultra-short critical sections (e.g. updating a single pointer or linked list node) where wait time is less than the cost of a context switch (< 500ns).

---

### 2. Linux Futex (Fast Userspace Mutex)
Traditional mutexes required an expensive OS system call (\`syscall\`) on every lock and unlock.
A **Futex**:
1. In the **uncontended case**, lock acquisition is a single assembly instruction: an atomic **Compare-And-Swap (CAS)** in user space (~10ns).
2. Only when contention is detected does the thread execute a \`futex()\` system call to sleep in the kernel.

---

### 3. ReentrantReadWriteLock (Shared / Exclusive)
In read-heavy data structures (like an in-memory cache or symbol table):
* Standard Mutex serializes all reads, creating a massive concurrency bottleneck.
* **ReadWriteLock Invariant:**
  * Multiple threads can hold the **Read Lock** concurrently.
  * Only ONE thread can hold the **Write Lock** (exclusive access).
* **Writer Starvation Risk:** If new readers arrive continuously, a writer might wait forever. Production locks enforce **Writer-Preference** (once a writer requests lock, subsequent readers are queued).`,
    equationsAndMath: [
      {
        name: 'Context Switch vs Spinlock Decision Rule',
        formula: 'T_{\\text{wait}} < 2 \\times T_{\\text{context\\_switch}} \\implies \\text{Spinlock outperforms Mutex}',
        explanation: 'If the critical section executes in under ~2 microseconds, spinlocks avoid expensive thread descheduling.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Mutex / ReentrantLock',
        pros: ['Zero CPU waste while waiting', 'Safe for long operations'],
        cons: ['Context-switching latency (~2µs) on contention'],
        bestFor: 'General application multi-threading',
      },
      {
        option: 'ReentrantReadWriteLock',
        pros: ['Massive throughput for 99:1 read-to-write workloads'],
        cons: ['Higher internal lock acquisition overhead than basic Mutex'],
        bestFor: 'In-memory caches, configuration tables',
      },
    ],
    interviewKeypoints: [
      'Explain Futexes: Fast userspace CAS when uncontended, falling back to kernel sleep only when contended.',
      'Warn against Writer Starvation in ReadWriteLocks and explain writer-preference queuing.',
    ],
  },

  {
    id: 'ch-54',
    unitId: 'unit-8',
    unitTitle: 'Low-Level Design (LLD), OOP & Concurrency',
    chapterNumber: 54,
    title: 'Lock-Free Data Structures & CAS Atomic Primitives',
    readingTimeMin: 16,
    summary:
      'Concurrent programming without locks: CPU hardware primitives (CMPXCHG), AtomicInteger, the ABA problem, and lock-free SPSC/MPMC ring buffers.',
    coreConcepts: [
      'Compare-And-Swap (CAS): Atomic CPU instruction (CMPXCHG on x86). If value at memory address equals expected, update to new value; return true.',
      'Lock-Free Invariant: At least one thread is guaranteed to make progress in a finite number of steps, even if other threads are suspended or preempted.',
      'The ABA Problem: Thread reads value A. Value changes from A to B and back to A. CAS succeeds even though hidden state changed! Solved via versioned pointers (Tagged Pointers).',
    ],
    deepContentMarkdown: `### The Limits of Locking

Locks suffer from severe failure modes:
1. **Priority Inversion:** A low-priority thread holding a lock is preempted, starving a high-priority thread.
2. **Deadlocks.**
3. **Thread Crash Vulnerability:** If a thread crashes while holding a lock, all other threads freeze forever.

**Lock-Free Programming** uses hardware-level atomic instructions to guarantee system progress without mutex locks.

---

### Hardware Compare-And-Swap (CAS)

At the silicon level, CPUs provide an atomic compare-and-swap instruction (\`CMPXCHG\` on x86, \`LDREX/STREX\` on ARM):

\`\`\`c
bool CompareAndSwap(int* addr, int expected, int new_val) {
    // Atomically executed by CPU memory controller:
    if (*addr == expected) {
        *addr = new_val;
        return true;
    }
    return false;
}
\`\`\`

#### Optimistic Lock-Free Loop Pattern:
\`\`\`java
public class AtomicCounter {
    private AtomicInteger count = new AtomicInteger(0);

    public void increment() {
        int current;
        int next;
        do {
            current = count.get();
            next = current + 1;
        } while (!count.compareAndSet(current, next)); // Loop retries if another thread raced ahead
    }
}
\`\`\`

---

### The ABA Problem & Tagged Pointers

Consider a Lock-Free Stack:
1. Top of stack is Node A $\\to$ Node B.
2. Thread 1 wants to pop A. It reads \`top = A\`, \`next = B\`.
3. Thread 1 is preempted by the OS scheduler.
4. Thread 2 pops A, pops B, and then pushes a new node with the recycled memory address A!
5. Stack is now Node A $\\to$ Node C.
6. Thread 1 wakes up and executes \`CAS(top, expected=A, new=B)\`.
7. Because memory address is still $A$, the CAS **succeeds**!
8. Top is set to $B$, which was already freed! **Memory corruption / segfault!**

#### The Solution: Tagged Pointers / Versioned References
Pair every pointer with an atomic integer version stamp:
\`\`\`
AtomicStampedReference(pointer = A, stamp = 104)
\`\`\`
When A is recycled, its stamp increments to 106. Thread 1\'s CAS fails because the stamps do not match!`,
    equationsAndMath: [
      {
        name: 'Lock-Free Progress Guarantee',
        formula: '\\exists T_i \\in \\text{Threads}: \\text{Progress}(T_i) = \\text{True}',
        explanation: 'In lock-free algorithms, system-wide progress is guaranteed even if individual threads retry repeatedly.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Lock-Free Data Structures',
        pros: ['Immune to deadlocks', 'Immune to priority inversion', 'Low latency under low-to-medium contention'],
        cons: ['High CPU spin consumption under extreme contention', 'Complex to implement safely (ABA problem)'],
        bestFor: 'LMAX Disruptor ring buffers, high-frequency trading matching engines',
      },
    ],
    interviewKeypoints: [
      'Explain the ABA problem and how AtomicStampedReference (versioned pointer) solves it.',
      'Explain that lock-free does NOT mean wait-free: individual threads can loop repeatedly, but the system as a whole always makes progress.',
    ],
  },

  {
    id: 'ch-55',
    unitId: 'unit-8',
    unitTitle: 'Low-Level Design (LLD), OOP & Concurrency',
    chapterNumber: 55,
    title: 'Thread Pool Sizing Math & Deadlock Prevention',
    readingTimeMin: 15,
    summary:
      'Tuning concurrency: Goetz\'s thread pool sizing formula, CPU-bound vs I/O-bound workloads, work-stealing pools, and Coffman deadlock conditions.',
    coreConcepts: [
      'Brian Goetz Pool Sizing Formula: N_threads = N_cpu * U_cpu * (1 + W/C). W/C is ratio of wait time to compute time.',
      'CPU-Bound Tasks: Size pool to N_cpu + 1 to maximize core utilization without thrashing.',
      'I/O-Bound Tasks: Size pool significantly larger (e.g. 50-200 threads) to keep CPU busy while threads wait on network/disk.',
      'The 4 Coffman Deadlock Conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.',
      'Deadlock Prevention: Global strict lock acquisition ordering eliminates Circular Wait.',
    ],
    deepContentMarkdown: `### Thread Pool Tuning & Sizing

Setting a thread pool too small underutilizes hardware; setting it too large causes CPU thrashing and out-of-memory errors.

---

### Brian Goetz\'s Thread Pool Sizing Formula (Java Concurrency in Practice)

$$N_{\\text{threads}} = N_{\\text{cpu}} \\times U_{\\text{cpu}} \\times \\left( 1 + \\frac{W}{C} \\right)$$

Where:
* $N_{\\text{cpu}}$: Number of available CPU cores (\`Runtime.getRuntime().availableProcessors()\`).
* $U_{\\text{cpu}}$: Target CPU utilization ($0 \\le U_{\\text{cpu}} \\le 1$, typically 0.8 to 0.9).
* $W$: Wait time (time spent waiting on network I/O, database queries, disk).
* $C$: Compute time (time spent executing CPU instructions).

#### Example 1: CPU-Bound Task (Image Rendering, Cryptography)
* Wait time is near zero ($W \\approx 0$).
* $N_{\\text{threads}} = 8 \\times 1.0 \\times (1 + 0) = \\mathbf{8 \\text{ threads}}$ (or $N_{\\text{cpu}} + 1$ to account for rare page faults).

#### Example 2: I/O-Bound Task (Web API querying Postgres)
* Request takes 100ms total: 95ms waiting on database ($W$), 5ms processing JSON ($C$).
* Ratio: $W / C = 95 / 5 = 19$.
* On an 8-core server:
  $$N_{\\text{threads}} = 8 \\times 0.9 \\times (1 + 19) = 7.2 \\times 20 = \\mathbf{144 \\text{ threads!}}$$

---

### Deadlock Elimination: Breaking the Coffman Conditions

A deadlock can occur **if and only if** all four **Coffman Conditions** hold simultaneously:
1. **Mutual Exclusion:** At least one resource must be held in non-shareable mode.
2. **Hold and Wait:** A thread holds a resource while waiting to acquire another.
3. **No Preemption:** Resources cannot be forcibly confiscated from a thread.
4. **Circular Wait:** Thread A waits for Thread B, which waits for Thread A.

#### The Golden Cure: Strict Global Lock Acquisition Hierarchy
To make circular wait mathematically impossible:
* Assign a global total ordering to all resources ($L_1 < L_2 < L_3$).
* Enforce a rule in code review: **Locks must ALWAYS be acquired in increasing order!**
* If Thread 1 needs Lock A and Lock B, it acquires A then B.
* If Thread 2 needs Lock A and Lock B, it is **forbidden** from acquiring B first; it MUST acquire A then B.
* **Result: Circular wait is mathematically impossible!**`,
    equationsAndMath: [
      {
        name: 'Goetz Thread Pool Sizing Formula',
        formula: 'N = N_{\\text{cpu}} \\times U_{\\text{cpu}} \\times \\left(1 + \\frac{W}{C}\\right)',
        explanation: 'Calculates the optimal number of worker threads to balance CPU utilization against I/O blocking delay.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Fixed Thread Pool with Bounded Queue',
        pros: ['Predictable memory consumption', 'Prevents OOM during traffic spikes'],
        cons: ['Rejects tasks when queue fills up (requires RejectedExecutionHandler policy)'],
        bestFor: 'Production microservice request handlers',
      },
      {
        option: 'Work-Stealing Pool (ForkJoinPool / Go Goroutines)',
        pros: ['Optimal multi-core CPU balance', 'Idle threads steal tasks from busy queues'],
        cons: ['Requires tasks to be non-blocking or cooperative'],
        bestFor: 'Divide-and-conquer parallel algorithms, reactive async event loops',
      },
    ],
    interviewKeypoints: [
      'Write down Brian Goetz\'s formula N = N_cpu * (1 + W/C) when asked how to size a thread pool.',
      'Recite the 4 Coffman conditions and explain how global lock ordering breaks Circular Wait.',
    ],
  },

  {
    id: 'ch-56',
    unitId: 'unit-8',
    unitTitle: 'Low-Level Design (LLD), OOP & Concurrency',
    chapterNumber: 56,
    title: 'Clean Architecture, Hexagonal & Domain-Driven Design',
    readingTimeMin: 16,
    summary:
      'Organizing enterprise codebases: Uncle Bob\'s Clean Architecture, Alistair Cockburn\'s Hexagonal (Ports & Adapters), Aggregates, Entities, Value Objects, and Domain Events.',
    coreConcepts: [
      'The Dependency Rule: Source code dependencies must point strictly inward toward the core domain logic. Outer layers know about inner layers; inner layers know nothing about outer layers.',
      'Hexagonal Architecture (Ports & Adapters): Core Domain is isolated at center; Ports are interfaces; Adapters are infrastructure implementations (REST controllers, SQL repositories).',
      'Domain-Driven Design (DDD): Entities (have unique ID), Value Objects (immutable, equality by attributes), Aggregates (transactional boundary with Aggregate Root).',
    ],
    deepContentMarkdown: `### Clean Architecture & Hexagonal Design

Software systems deteriorate when framework details (Spring, Express, PostgreSQL) leak into core business logic.

**Clean Architecture** (Robert C. Martin) and **Hexagonal Architecture** (Alistair Cockburn) establish an architectural boundary where business logic is 100% pure and independent of UI, databases, and third-party frameworks.

---

### The Concentric Circles & The Dependency Rule

\`\`\`
┌────────────────────────────────────────────────────────┐
│ Frameworks & Drivers: Web (HTTP), Database (SQL), UI   │  <-- Outer Ring
├────────────────────────────────────────────────────────┤
│ Interface Adapters: Controllers, Presenters, Gateways  │
├────────────────────────────────────────────────────────┤
│ Application Business Rules: Use Cases / Interactors    │
├────────────────────────────────────────────────────────┤
│ Enterprise Business Rules: Entities & Domain Logic     │  <-- Core Center
└────────────────────────────────────────────────────────┘
\`\`\`

#### The Dependency Rule:
$$\\text{Source code dependencies must point strictly INWARD.}$$
* The **Domain Layer** has **ZERO dependencies** on external libraries (no SQL imports, no HTTP imports).
* Changing from PostgreSQL to MongoDB, or from REST to gRPC, modifies **only the outermost ring**—the core domain logic remains 100% untouched!

---

### Hexagonal Architecture (Ports and Adapters)

1. **The Core Domain:** Contains business logic and domain entities.
2. **Ports (Interfaces):**
   * **Inbound (Driving) Ports:** Interfaces that define how outside actors can invoke the domain (e.g. \`CreateOrderUseCase\`).
   * **Outbound (Driven) Ports:** Interfaces that define what the domain requires from the outside world (e.g. \`OrderRepositoryPort\`, \`PaymentGatewayPort\`).
3. **Adapters (Implementations):**
   * **Driving Adapters:** HTTP REST Controller, CLI, Kafka Consumer. They translate external requests into invocations of Driving Ports.
   * **Driven Adapters:** PostgreSQL Repository, Stripe API Client. They implement Driven Ports.

---

### Domain-Driven Design (DDD) Core Building Blocks

* **Entities:** Objects with a distinct conceptual identity that runs through time (e.g. \`User\` identified by \`UUID\`). Two users with identical names and emails are still distinct if their IDs differ.
* **Value Objects:** Immutable objects defined entirely by their attributes (e.g. \`Money(amount: 100, currency: "USD")\`, \`Address\`). Two Money objects with the same amount and currency are completely interchangeable.
* **Aggregate & Aggregate Root:** A cluster of associated domain objects treated as a single transactional unit for data changes. External references may only reference the **Aggregate Root** (e.g. \`Order\` is the root; \`OrderLine\` is an internal entity that can only be modified through methods on \`Order\`).`,
    equationsAndMath: [
      {
        name: 'Inversion of Control Dependency Direction',
        formula: '\\text{Domain} \\not\\to \\text{Infrastructure} \\quad \\mid \\quad \\text{Infrastructure} \\to \\text{Domain Ports}',
        explanation: 'Dependency inversion guarantees business logic is decoupled from external database frameworks and libraries.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Clean / Hexagonal Architecture',
        pros: ['100% unit-testable business logic without databases', 'Framework independence (swap DBs easily)', 'Maintainable across decades'],
        cons: ['Higher initial class count (mappers, DTOs, ports, adapters)'],
        bestFor: 'Complex enterprise domains, long-lived products',
      },
    ],
    interviewKeypoints: [
      'Draw the Ports & Adapters diagram when structuring an LLD machine coding project.',
      'Differentiate between Entities (identified by ID) and Value Objects (immutable, identified by attributes).',
    ],
  },
]
