import type { TheoryChapter } from '../../types'

export const UNIT_7_CHAPTERS: TheoryChapter[] = [
  {
    id: 'ch-43',
    unitId: 'unit-7',
    unitTitle: 'Consensus Algorithms & Distributed Coordination',
    chapterNumber: 43,
    title: 'The Paxos Protocol: Phase 1 & Phase 2 Deconstructed',
    readingTimeMin: 16,
    summary:
      'Leslie Lamport\'s foundational consensus algorithm: Proposers, Acceptors, Learners, Phase 1a/1b (Prepare/Promise), Phase 2a/2b (Accept/Accepted), and Multi-Paxos optimization.',
    coreConcepts: [
      'The Consensus Problem: Getting multiple distributed nodes to agree on a single value in an asynchronous network where nodes can crash and messages can be delayed or dropped.',
      'Roles: Proposers (propose values), Acceptors (vote on values), Learners (learn agreed value).',
      'Phase 1 (Prepare): Proposer sends Prepare(n) with proposal number n. Acceptors promise not to accept any proposals < n and return highest-numbered proposal accepted so far.',
      'Phase 2 (Accept): Proposer sends Accept(n, v). If a majority accepts, value v is permanently chosen.',
      'Multi-Paxos: Elects a stable leader to skip Phase 1 for subsequent requests, reducing consensus to 1 RTT.',
    ],
    deepContentMarkdown: `### The Foundations of Consensus: Paxos (Leslie Lamport, 1998)

Distributed consensus algorithms guarantee that a cluster of machines agree on a sequence of state machine operations, even when some machines crash or network links partition.

---

### The Two-Phase Paxos Protocol

\`\`\`
Proposer                               Acceptors (Quorum: Majority)
   │                                                │
   ├─── Phase 1a: PREPARE(n) ──────────────────────►│
   │                                                │ (Acceptors promise to reject < n)
   │◄── Phase 1b: PROMISE(n, highest_accepted) ─────┤
   │                                                │
   ├─── Phase 2a: ACCEPT(n, v) ─────────────────────►│
   │                                                │ (Acceptors vote if n >= promised)
   │◄── Phase 2b: ACCEPTED(n, v) ───────────────────┤
\`\`\`

#### Phase 1: Prepare & Promise
1. **Proposer** chooses a unique, monotonic proposal number $n$ (where $n >$ any previously used proposal number) and broadcasts \`Prepare(n)\` to a majority of Acceptors.
2. **Acceptor** receives \`Prepare(n)\`:
   * If $n > \\max(\\text{promised})$, Acceptor promises **never to accept any future proposals numbered less than $n$**.
   * Acceptor returns \`Promise(n, max_accepted_val, max_accepted_n)\` to the proposer.

#### Phase 2: Accept & Accepted
1. Once the Proposer receives promises from a **majority of Acceptors**:
   * It sets value $v$: If any acceptor reported an already-accepted value in Phase 1b, the proposer **MUST adopt the value with the highest proposal number**. If no acceptor returned a value, the proposer can propose its own value.
   * Proposer broadcasts \`Accept(n, v)\` to acceptors.
2. **Acceptor** receives \`Accept(n, v)\`:
   * It accepts $(n, v)$ unless it has already promised to ignore proposal numbers $\\le n$.
3. When a **majority of Acceptors accept $(n, v)$**, the value $v$ is **officially chosen and committed**.

---

### Multi-Paxos Optimization
Executing two full round-trips (Phase 1 + Phase 2) for every client write is too slow.
**Multi-Paxos** elects a single stable **Proposer Leader**:
* Phase 1 is executed **only once** during leader election.
* For all subsequent client writes, the leader executes **only Phase 2**, achieving consensus in a **single round-trip (1 RTT)**!`,
    equationsAndMath: [
      {
        name: 'Paxos Quorum Intersection',
        formula: '|Q_1 \\cap Q_2| \\ge 1 \\quad \\text{where } |Q| = \\lfloor N/2 \\rfloor + 1',
        explanation: 'Any two majorities of Acceptors must overlap by at least one node, guaranteeing that Phase 1b will discover any value committed in Phase 2.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Basic Paxos',
        pros: ['Mathematically proven safety', 'Decentralized proposers'],
        cons: ['2 RTTs per write', 'Vulnerable to livelock (dueling proposers)'],
        bestFor: 'Academic reference, single-value decisions',
      },
      {
        option: 'Multi-Paxos',
        pros: ['1 RTT consensus per write', 'Industry standard'],
        cons: ['Highly complex leader changeover logic (not fully specified in original paper)'],
        bestFor: 'Google Chubby, Google Spanner, Apache Cassandra LWT',
      },
    ],
    interviewKeypoints: [
      'Explain why the proposer MUST adopt the highest-numbered accepted value reported by acceptors in Phase 1b—this is the core invariant preserving safety.',
      'Differentiate between Single-Degree Paxos (2 RTT) and Multi-Paxos (1 RTT via stable leader).',
    ],
  },

  {
    id: 'ch-44',
    unitId: 'unit-7',
    unitTitle: 'Consensus Algorithms & Distributed Coordination',
    chapterNumber: 44,
    title: 'The Raft Consensus Algorithm: Election & Replication',
    readingTimeMin: 16,
    summary:
      'Ongaro and Ousterhout\'s understandable consensus protocol: Leader election with randomized timeouts, log replication, the Log Matching Invariant, and safety restrictions.',
    coreConcepts: [
      'Design for Understandability: Raft decomposes consensus into Leader Election, Log Replication, and Safety.',
      'Node States: Follower (passive responder), Candidate (solicits votes), Leader (handles client writes).',
      'Randomized Election Timers: Prevents split votes by staggering candidate timeouts between 150ms and 300ms.',
      'The Up-to-Date Rule: Followers reject vote requests from candidates whose logs are less up-to-date than their own.',
      'Log Matching Invariant: If two logs contain an entry with the same index and term, they store the same command, and all preceding entries are identical.',
    ],
    deepContentMarkdown: `### The Breakthrough of Raft (Ongaro & Ousterhout, 2014)

Paxos was historically notorious for being impenetrable and difficult to implement in production software. In 2014, Diego Ongaro and John Ousterhout introduced **Raft** (*"In Search of an Understandable Consensus Algorithm"*), which has become the de facto standard for distributed consensus (etcd, Consul, TiKV, CockroachDB, Kafka KRaft).

---

### The Three Node States

\`\`\`
       ┌─────────────────────── Timeout ──────────────────────┐
       │                                                      ▼
[ Follower ] ──(Heartbeat Timeout)──► [ Candidate ] ──(Votes >= N/2+1)──► [ Leader ]
     ▲                                      │                                │
     └─────── Discovers Higher Term ────────┴─────── Discovers Higher Term ──┘
\`\`\`

---

### 1. Leader Election
1. Nodes begin as **Followers**. Leaders send periodic empty \`AppendEntries\` RPCs (heartbeats) every 50ms.
2. If a follower receives no heartbeat for its **Election Timeout** (randomized between **150ms and 300ms**):
   * Follower increments its current term ($Term = Term + 1$).
   * Transitions to **Candidate**.
   * Votes for itself and sends \`RequestVote\` RPCs to all peers.
3. If Candidate receives votes from a **majority** of nodes ($\\lfloor N/2 \\rfloor + 1$):
   * Becomes the cluster **Leader**!
   * Immediately begins broadcasting heartbeats.

#### The Election Safety Invariant (Up-to-Date Rule):
A follower will **REFUSE** to vote for a candidate if the candidate\'s log is less up-to-date than its own:
$$\\text{Deny vote if } (Term_{\\text{cand}} < Term_{\\text{local}}) \\lor (Term_{\\text{cand}} == Term_{\\text{local}} \\land Index_{\\text{cand}} < Index_{\\text{local}})$$

Because any elected leader must secure votes from a majority, **the leader is mathematically guaranteed to contain every single committed entry from all previous terms!**

---

### 2. Log Replication
1. Client sends write command to Leader.
2. Leader appends command to its local log as an uncommitted entry.
3. Leader broadcasts \`AppendEntries\` RPC containing the entry to all followers.
4. When a **majority of followers** acknowledge storing the entry on disk:
   * Leader marks entry as **COMMITTED**.
   * Leader applies entry to its local state machine.
   * Leader returns success response to the client.
5. Leader updates its \`leaderCommit\` index in subsequent heartbeats; followers apply the committed entry to their local state machines.`,
    equationsAndMath: [
      {
        name: 'Raft Majority Quorum',
        formula: 'Q_{\\text{majority}} = \\lfloor N / 2 \\rfloor + 1',
        explanation: 'A 5-node cluster requires 3 nodes for quorum; it can tolerate the simultaneous crash of 2 nodes.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Raft Consensus',
        pros: ['Highly understandable', 'Strong leadership simplifies log replication', 'De facto industry standard (etcd, Consul)'],
        cons: ['Single leader can become throughput bottleneck (mitigated via Multi-Raft)'],
        bestFor: 'Distributed configuration, service discovery, distributed metadata stores',
      },
    ],
    interviewKeypoints: [
      'Explain randomized election timeouts (150-300ms): Staggering timers ensures one candidate times out first, preventing split votes.',
      'Explain the Up-to-Date rule: A candidate cannot win an election unless its log has all committed entries.',
    ],
  },

  {
    id: 'ch-45',
    unitId: 'unit-7',
    unitTitle: 'Consensus Algorithms & Distributed Coordination',
    chapterNumber: 45,
    title: 'ZooKeeper & Chubby: Ephemeral Nodes & Distributed Locks',
    readingTimeMin: 15,
    summary:
      'Distributed coordination primitives: Hierarchical znodes (Persistent, Ephemeral, Sequential), push-based Watches, and building distributed locks without race conditions.',
    coreConcepts: [
      'Znode Hierarchy: Filesystem-like tree structure (/locks/resource_1).',
      'Ephemeral Znodes: Node is tied to the client TCP session. If client crashes or heartbeat times out, ZooKeeper deletes the znode automatically.',
      'Sequential Znodes: ZooKeeper atomically appends a monotonically increasing 10-digit number to the node path.',
      'Watches: Asynchronous one-time event triggers notifying clients of node creation, deletion, or modification.',
    ],
    deepContentMarkdown: `### The Coordination Problem

When multiple distributed services must elect a master, coordinate leader failover, or acquire a distributed lock, writing custom consensus code inside every application is fraught with peril.

**Apache ZooKeeper** (and Google Chubby) provides a centralized, highly reliable coordination service.

---

### Znode Types in ZooKeeper

Data is organized as a hierarchical tree of **znodes**:
1. **Persistent Znode:** Exists until explicitly deleted by an API call.
2. **Ephemeral Znode:** Tied to the client\'s active TCP session. If the client machine crashes, dies, or loses network connectivity for its session timeout, ZooKeeper **automatically deletes the ephemeral znode**!
3. **Sequential Znode:** When created with the sequential flag, ZooKeeper appends an atomic, monotonically increasing 10-digit integer to the path (\`/queue/task-0000000001\`, \`/queue/task-0000000002\`).

---

### Implementing Fair Distributed Locks Without Herd Effect

A naive lock implementation creates \`/locks/resource\`. If 1,000 clients set a watch on that node, releasing the lock wakes up all 1,000 clients (**Thundering Herd**), overwhelming ZooKeeper.

#### The Elegant Recipe (Fair Locking):
1. Client $C$ creates an **Ephemeral Sequential** znode:
   \`\`\`
   /locks/order_lock/guid-lock-0000000003
   \`\`\`
2. Client queries children of \`/locks/order_lock\`.
3. If $C$\'s node has the **lowest sequence number**:
   * **Client $C$ holds the lock!**
4. If $C$\'s node does NOT have the lowest sequence:
   * Client identifies the node with the **immediately preceding sequence number** (e.g. \`guid-lock-0000000002\`).
   * Client sets a **Watch** *only* on that specific predecessor node!
5. When the lock holder releases its lock, only the **single next client in line is notified**, completely eliminating the Herd Effect!`,
    equationsAndMath: [
      {
        name: 'Fair Lock Notification Complexity',
        formula: '\\text{Notifications on Lock Release} = \\mathcal{O}(1)',
        explanation: 'Watching only the immediately preceding sequential znode ensures exactly one waiting client is notified per lock release.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'ZooKeeper Distributed Locks',
        pros: ['Strict linearizable guarantees', 'Automatic lock release on client crash via ephemeral nodes', 'Zero herd effect with sequential nodes'],
        cons: ['ZooKeeper cluster maintenance overhead', 'Session timeout tuning required'],
        bestFor: 'Leader election, cluster master nomination, heavy distributed locks',
      },
    ],
    interviewKeypoints: [
      'Explain how Ephemeral Sequential nodes create fair FIFO distributed locks without the Thundering Herd effect.',
      'Explain that ZooKeeper znodes are designed for lightweight metadata (< 1MB per node), not heavy data storage.',
    ],
  },

  {
    id: 'ch-46',
    unitId: 'unit-7',
    unitTitle: 'Consensus Algorithms & Distributed Coordination',
    chapterNumber: 46,
    title: 'Cluster Membership Changes: Joint Consensus',
    readingTimeMin: 14,
    summary:
      'Dynamically adding and removing servers in Raft and Paxos without split-brain: The flaw of single-step transitions, Joint Consensus two-phase configurations, and single-server membership changes.',
    coreConcepts: [
      'The Membership Problem: Updating cluster configuration from 3 nodes to 5 nodes cannot happen instantaneously on all machines.',
      'Split-Brain Vulnerability: If configuration changes take effect at different times, two disjoint majorities can elect two separate leaders simultaneously.',
      'Joint Consensus: Transitional configuration C_old,new requiring majorities from BOTH the old configuration AND the new configuration.',
    ],
    deepContentMarkdown: `### The Danger of Cluster Membership Changes

In distributed consensus, adding or removing servers dynamically is dangerous. Because machines communicate asynchronously, nodes cannot switch from the old configuration ($C_{\\text{old}}$) to the new configuration ($C_{\\text{new}}$) at the exact same instant.

#### The Split-Brain Disaster:
* Suppose a cluster expands from 3 nodes ($C_{\\text{old}} = \\{1, 2, 3\\}$) to 5 nodes ($C_{\\text{new}} = \\{1, 2, 3, 4, 5\\}$).
* Node 1 and Node 2 adopt $C_{\\text{new}}$ first.
* Node 3 still operates under $C_{\\text{old}}$.
* **Two disjoint majorities form:**
  * Node 1 and 2 need 3 votes in $C_{\\text{new}}$: They elect Node 1.
  * Node 3 and any lagging node need 2 votes in $C_{\\text{old}}$: They elect Node 3.
* **The cluster now has two independent leaders executing divergent writes!**

---

### The Joint Consensus Solution (Raft)

Raft solves this by introducing a transitional configuration called **Joint Consensus** ($C_{\\text{old,new}}$):

1. **Phase 1 (Enter Joint Consensus):**
   * Leader logs configuration entry $C_{\\text{old,new}}$.
   * Once committed, any consensus decision requires **two independent majorities**:
     $$\\text{Majority of } C_{\\text{old}} \\quad \\mathbf{AND} \\quad \\text{Majority of } C_{\\text{new}}$$
   * No single leader can be elected without agreement from both groups!
2. **Phase 2 (Commit New Configuration):**
   * Leader logs configuration entry $C_{\\text{new}}$.
   * Once committed, the cluster transitions permanently to $C_{\\text{new}}$. Nodes not in $C_{\\text{new}}$ shut down.`,
    equationsAndMath: [
      {
        name: 'Joint Consensus Quorum Invariant',
        formula: 'Q_{\\text{valid}} = Q(C_{\\text{old}}) \\cap Q(C_{\\text{new}})',
        explanation: 'Any decision in joint consensus must secure overlapping majorities from both the historical and prospective cluster configurations.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Joint Consensus (Two-Phase)',
        pros: ['Supports arbitrary arbitrary multi-node cluster expansions/contractions safely'],
        cons: ['Complex state machine transition'],
        bestFor: 'Multi-datacenter migration, large batch server replacement',
      },
      {
        option: 'Single-Server Changes (Raft Alternative)',
        pros: ['Simpler implementation (add or remove exactly one server at a time)'],
        cons: ['Slow: adding 5 servers requires 5 sequential membership rounds'],
        bestFor: 'Routine single-node scale-out/scale-in',
      },
    ],
    interviewKeypoints: [
      'Explain why cluster membership changes cannot happen in a single step: overlapping majorities between old and new configurations cause split-brain.',
      'Walk through Raft Joint Consensus (C_old,new) as the rigorous solution.',
    ],
  },

  {
    id: 'ch-47',
    unitId: 'unit-7',
    unitTitle: 'Consensus Algorithms & Distributed Coordination',
    chapterNumber: 47,
    title: 'Gossip Protocols & Failure Detection (SWIM Protocol)',
    readingTimeMin: 15,
    summary:
      'Decentralized cluster membership and health tracking: Epidemic dissemination, the SWIM protocol, indirect pinging, suspicion mechanisms, and phi-accrual failure detectors.',
    coreConcepts: [
      'Epidemic Dissemination: Nodes periodically exchange cluster state with random peers over UDP. Information spreads exponentially like a virus.',
      'The False Positive Problem: Heartbeat timeouts over jittery networks trigger false failure alarms.',
      'SWIM Protocol (Structured Weakly-Consistent Infection-Style): Decouples failure detection from membership updates using ping-req indirect probes.',
      'Phi-Accrual Failure Detector: Outputs a continuous scale probability of failure rather than a binary true/false.',
    ],
    deepContentMarkdown: `### The Limits of Centralized Heartbeats

In small clusters (5 nodes), every node can ping every other node ($O(N^2)$ network messages). In clusters with **thousands of nodes** (Cassandra, Consul, Redis Cluster), centralized heartbeats saturate network switches.

**Gossip Protocols** use epidemic information dissemination to achieve scalable, decentralized cluster coordination.

---

### The SWIM Protocol (Das, Gupta, Motivala, 2002)

SWIM solves failure detection with **$O(1)$ constant network overhead per node**, regardless of cluster size!

\`\`\`
Direct Probe:
[ Node A ] ──(Ping)──► [ Node B ] (No response within timeout)

Indirect Probe (Ping-Req):
[ Node A ] ──(Ping-Req)──► [ Node C ] ──(Ping)──► [ Node B ]
                         └─(Ping-Req)──► [ Node D ] ──(Ping)──► [ Node B ]
* If Node C or D gets a response from B, Node B is HEALTHY!
  (Protects against localized network link drops between A and B).
\`\`\`

#### How SWIM Works:
1. Every $T$ time units, Node A picks a **random peer** (Node B) and sends a UDP \`Ping\`.
2. If Node B responds with \`Ack\`, Node B is healthy.
3. If Node B does **NOT** respond within timeout:
   * Node A does NOT declare B dead! (The direct network link between A and B might be dropping packets).
   * Node A sends **\`Ping-Req\`** to $k$ random auxiliary peers (e.g. Node C, Node D).
   * Nodes C and D attempt to ping Node B on Node A\'s behalf.
   * If any auxiliary peer receives an \`Ack\` from B, Node B is declared **HEALTHY**.
4. If all indirect probes fail, Node B is transitioned to the **Suspicious** state.
5. If Node B does not refute the suspicion within a grace period, it is officially broadcast as **DEAD** via gossip piggybacked on regular ping packets!`,
    equationsAndMath: [
      {
        name: 'Gossip Dissemination Latency',
        formula: 'T_{\\text{spread}} = \\mathcal{O}(\\log N)',
        explanation: 'Information spreads to all N nodes in logarithmic rounds with high probability, even under 50% packet loss.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'SWIM Gossip Protocol',
        pros: ['O(1) message load per node', 'O(log N) infection dissemination', 'Immune to single-point-of-failure'],
        cons: ['Weak/eventual consistency (membership list converges asymptotically)'],
        bestFor: 'Large-scale cluster membership (HashiCorp Consul/Serf, Cassandra, Dynamo)',
      },
    ],
    interviewKeypoints: [
      'Explain SWIM\'s indirect probe (ping-req): protects against false positives when a single network link between two servers drops packets.',
      'Highlight that gossip message overhead is constant O(1) per node, making it scale to tens of thousands of servers.',
    ],
  },

  {
    id: 'ch-48',
    unitId: 'unit-7',
    unitTitle: 'Consensus Algorithms & Distributed Coordination',
    chapterNumber: 48,
    title: 'Distributed Deadlocks: Chandy-Misra-Haas Algorithm',
    readingTimeMin: 14,
    summary:
      'Detecting and breaking distributed circular wait deadlocks: Wait-For Graphs (WFG), edge-chasing probe algorithms, and lock timeout heuristics.',
    coreConcepts: [
      'The Four Coffman Conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.',
      'Distributed Deadlock: Transaction A on Node 1 waits for resource held by Transaction B on Node 2, while Transaction B waits for resource held by Transaction A on Node 1.',
      'Edge-Chasing (Chandy-Misra-Haas): Propagates probe messages probe(initiator, sender, receiver) along the wait-for graph. If the probe returns to initiator, a cycle exists.',
    ],
    deepContentMarkdown: `### The Distributed Deadlock Problem

In a single-machine database, the lock manager detects deadlocks by maintaining an in-memory **Wait-For Graph (WFG)** and periodically running cycle detection algorithms (Tarjan\'s strongly connected components in $O(V + E)$).

In a distributed database where transactions hold locks across multiple independent shards, **no single machine has a complete picture of the global Wait-For Graph**.

---

### The Chandy-Misra-Haas Edge-Chasing Algorithm

Rather than aggregating a centralized global graph, the **Chandy-Misra-Haas (CMH)** algorithm detects deadlocks using distributed **probe messages (edge chasing)**:

1. When Transaction $T_i$ blocks waiting for a lock held by Transaction $T_j$:
   * If $T_j$ is local, standard local tracking applies.
   * If $T_j$ is on a remote node, $T_i$ generates and transmits a **Probe**:
     $$\\text{Probe}(\\text{initiator} = T_i, \\text{sender} = T_i, \\text{receiver} = T_j)$$
2. When Transaction $T_j$ receives the probe:
   * It checks if it is waiting for any other transactions ($T_k$).
   * If so, $T_j$ forwards the probe to all transactions it is waiting for:
     $$\\text{Probe}(\\text{initiator} = T_i, \\text{sender} = T_j, \\text{receiver} = T_k)$$
3. **Cycle Detection Condition:**
   * If the probe travels through the distributed wait-for dependency chain and **returns back to the original initiator $T_i$**:
   * **A distributed deadlock cycle is mathematically proven to exist!**

---

### Deadlock Resolution
Once the cycle is detected, one transaction in the loop must be selected as the **Victim** and aborted:
* **Wait-Die (Non-Preemptive):** Older transactions wait for younger ones; younger transactions abort immediately if they attempt to wait for older ones.
* **Wound-Wait (Preemptive):** Older transactions preempt ("wound") younger ones; younger transactions wait for older ones. Prevents starvation!`,
    equationsAndMath: [
      {
        name: 'Chandy-Misra-Haas Probe Invariant',
        formula: '\\text{Cycle Detected} \\iff \\text{Probe}(T_{\\text{init}}) \\text{ is received by } T_{\\text{init}}',
        explanation: 'A probe returning to its initiator proves the existence of a directed cycle in the distributed wait-for graph.',
      },
    ],
    tradeoffMatrix: [
      {
        option: 'Lock Timeout Heuristic',
        pros: ['Extremely simple to implement (abort transaction after 5-second lock timeout)'],
        cons: ['Aborts long-running transactions that are not actually deadlocked (false positives)'],
        bestFor: 'General web applications',
      },
      {
        option: 'Edge-Chasing (Chandy-Misra-Haas)',
        pros: ['Zero false aborts; detects exact deadlock cycles'],
        cons: ['Message overhead during lock contention'],
        bestFor: 'Distributed relational SQL databases (CockroachDB, Spanner, Vitess)',
      },
    ],
    interviewKeypoints: [
      'Explain Wound-Wait vs Wait-Die for deadlock prevention.',
      'Describe edge-chasing probes: if an initiator receives its own probe message, a distributed circular wait cycle exists.',
    ],
  },
]
