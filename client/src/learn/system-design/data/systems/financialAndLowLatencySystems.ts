import type { SystemDesignModel } from '../../types'

export const FINANCIAL_AND_LOW_LATENCY_SYSTEMS: SystemDesignModel[] = [
  {
    id: 'payment-ledger',
    name: 'Distributed Payment Gateway & Double-Entry Ledger',
    category: 'Financial & Reliability',
    difficulty: 'Expert',
    tagline: 'Mission-critical financial ledger enforcing double-entry invariant (Sum of Debits + Credits = 0), UUID idempotency keys, and distributed Saga compensations.',
    throughput: '10,000 transactions/sec with zero balance discrepancies',
    latency: 'p99 Payment Capture < 150ms (dominated by 3rd-party banking acquirers)',
    storageScale: 'Immutable append-only ledger entries retained forever',
    overview:
      'A resilient, audit-compliant financial payment engine. Prevents duplicate charges via UUID idempotency keys stored in Redis, implements immutable double-entry bookkeeping where every monetary movement balances to zero across debits and credits, and coordinates multi-step banking settlement via distributed Saga orchestrators.',
    functionalReqs: [
      'Idempotent payment initiation: Re-sending a request with the same Idempotency-Key must never charge twice.',
      'Strict double-entry bookkeeping: Every transaction consists of balanced debits and credits.',
      'Saga transaction orchestration: Handle card authorization, ledger commit, fraud check, and acquirer settlement.',
      'Compensating transactions: Issue refunds/reversals automatically if downstream settlement fails.',
    ],
    nonFunctionalReqs: [
      'Zero financial balance discrepancies (100% auditability).',
      'PCI-DSS compliance (tokenized credit card data).',
      'Immutable audit log: Ledger entries can never be modified or deleted, only counter-balanced.',
    ],
    calculations: [
      {
        metric: 'Double-Entry Invariant Rule',
        formula: 'SUM(Debits) + SUM(Credits) == 0 for every transaction',
        result: 'Guarantees money is never created or destroyed out of thin air',
      },
      {
        metric: 'Idempotency Cache TTL',
        formula: 'SET idempotency:{uuid} {result} NX EX 86400 (24-hour window)',
        result: 'Protects against network retry duplicate charges for 24 hours',
      },
    ],
    services: [
      { id: 'merchant', name: 'Checkout Client / Merchant', role: 'Sends POST /v1/charges with Idempotency-Key', type: 'client', x: 10, y: 50, icon: 'CreditCard', techStack: 'Stripe SDK / Mobile', details: 'Sends transaction request' },
      { id: 'gateway', name: 'Payment API Gateway', role: 'Verifies idempotency & fraud check', type: 'gateway', x: 30, y: 50, icon: 'Shield', techStack: 'Envoy / Go', details: 'Checks Redis for duplicate idempotency key' },
      { id: 'saga-orchestrator', name: 'Payment Saga Orchestrator', role: 'Coordinates multi-step transaction workflow', type: 'service', x: 50, y: 35, icon: 'Layers', techStack: 'Temporal / Go State Machine', details: 'Executes Auth -> Ledger -> Acquirer steps' },
      { id: 'ledger-db', name: 'Double-Entry Ledger DB', role: 'Append-only ledger entries', type: 'database', x: 75, y: 20, icon: 'BookOpen', techStack: 'PostgreSQL (Serializable Isolation)', details: 'Enforces SUM(amount) == 0 constraint' },
      { id: 'bank-acquirer', name: 'Visa / Banking Acquirer', role: 'External financial settlement network', type: 'service', x: 75, y: 65, icon: 'Landmark', techStack: 'External Banking API', details: 'Authorizes card funds over ISO 8583' },
    ],
    connections: [
      { id: 'c1', from: 'merchant', to: 'gateway', label: 'POST /v1/charges (Idempotency-Key: uuid)', protocol: 'HTTPS' },
      { id: 'c2', from: 'gateway', to: 'saga-orchestrator', label: 'StartPaymentSaga()', protocol: 'gRPC' },
      { id: 'c3', from: 'saga-orchestrator', to: 'bank-acquirer', label: 'AuthorizeCardFunds()', protocol: 'HTTPS' },
      { id: 'c4', from: 'saga-orchestrator', to: 'ledger-db', label: 'CommitLedgerEntries()', protocol: 'SQL' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Idempotent Payment Submission',
        description: 'Customer initiates $100 checkout. Merchant sends POST /v1/charges with header "Idempotency-Key: idemp_9012a".',
        fromNode: 'merchant',
        toNode: 'gateway',
        protocol: 'HTTPS',
        payload: { amountCents: 10000, currency: 'USD', cardToken: 'tok_visa_4242', idempotencyKey: 'idemp_9012a' },
        codeRef: { file: 'payment_handler.go', lineHighlight: '15-28', funcName: 'ProcessCharge', codeExplanation: 'Executes atomic Redis SETNX idempotency:idemp_9012a to lock transaction.' },
        stateChange: 'Gateway verifies this is a new transaction.',
      },
      {
        step: 2,
        title: 'Step 2: External Bank Authorization',
        description: 'Saga orchestrator contacts Visa / Banking Acquirer to authorize $100 hold on customer credit card.',
        fromNode: 'saga-orchestrator',
        toNode: 'bank-acquirer',
        protocol: 'HTTPS',
        payload: { amount: 100.00, currency: 'USD', authCode: 'AUTH_89104' },
        codeRef: { file: 'acquirer_client.go', lineHighlight: '20-35', funcName: 'AuthorizeFunds', codeExplanation: 'External banking call succeeds with auth code AUTH_89104.' },
        stateChange: 'Card funds reserved; acquirer returns authorization token.',
      },
      {
        step: 3,
        title: 'Step 3: Double-Entry Ledger Commit',
        description: 'Orchestrator writes balanced ledger entries to Postgres: Debit Customer Cash (-$100), Credit Merchant Account (+$100).',
        fromNode: 'saga-orchestrator',
        toNode: 'ledger-db',
        protocol: 'SQL',
        payload: {
          transactionId: 'tx_789123',
          entries: [
            { account: 'customer_cash', amountCents: -10000 },
            { account: 'merchant_receivable', amountCents: 10000 },
          ],
          netBalanceCheck: 0,
        },
        codeRef: { file: 'ledger.sql', lineHighlight: '1-18', funcName: 'PostLedgerTransaction', codeExplanation: 'Database trigger verifies sum(-10000 + 10000) == 0; transaction commits.' },
        stateChange: 'Ledger committed safely; customer receives receipt.',
      },
    ],
    codeFiles: [
      {
        name: 'ledger.sql',
        language: 'sql',
        role: 'Double-Entry Bookkeeping Schema & Strict Balance Trigger',
        code: `-- PostgreSQL Financial Ledger Tables
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    idempotency_key VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    amount_cents BIGINT NOT NULL, -- Negative = Debit, Positive = Credit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to enforce financial invariant: Sum of amounts must be 0
CREATE OR REPLACE FUNCTION verify_ledger_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT SUM(amount_cents) FROM ledger_entries WHERE transaction_id = NEW.transaction_id) != 0 THEN
        RAISE EXCEPTION 'Financial invariant violated: Transaction entries do not balance to zero!';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Financial systems must guarantee zero balance anomalies. The architecture combines three lines of defense: Redis-backed UUID idempotency keys to eliminate network retry duplicates, distributed Saga orchestrators to manage multi-party bank failures, and strict database triggers enforcing the double-entry accounting identity (Debits + Credits = 0).',
      databaseSchema: 'PostgreSQL: accounts, transactions, ledger_entries with mathematical balance verification trigger.',
      apiEndpoints: [
        { method: 'POST', path: '/v1/charges', desc: 'Processes an idempotent financial charge' },
      ],
      bottlenecksAndTradeoffs: [
        'Serializable Isolation vs Throughput: Financial accounts updated by thousands of concurrent transactions experience lock contention under strict Serializable isolation. Solved by appending immutable ledger lines without updating account balances in-place; account balance is calculated as SUM(amount_cents) or periodically rolled up via materialized snapshots.',
      ],
    },
  },
  {
    id: 'order-book',
    name: 'Stock Exchange Limit Order Matching Engine',
    category: 'Financial & Reliability',
    difficulty: 'Expert',
    tagline: 'Ultra-low latency financial matching engine utilizing the LMAX Disruptor lock-free ring buffer and price-time priority in-memory order books.',
    throughput: '6,000,000 orders/sec on a single commodity server core',
    latency: 'Sub-microsecond (< 1µs) deterministic order matching',
    storageScale: 'In-memory state machine with asynchronous binary WAL persistence',
    overview:
      'An ultra-low latency financial exchange matching engine. Avoids traditional mutex lock contention and garbage collection pauses by implementing a single-writer architecture powered by a lock-free ring buffer (LMAX Disruptor). Maintains B-Tree / Red-Black Tree in-memory order books enforcing Price-Time Priority (FIFO) matching.',
    functionalReqs: [
      'Limit Orders (Buy/Sell with specified price and quantity).',
      'Market Orders (Immediate execution at best available price).',
      'Price-Time Priority (FIFO execution among identical price levels).',
      'Real-Time Market Data feed (Order Book Level 2 & Trade Tape).',
    ],
    nonFunctionalReqs: [
      'Deterministic sub-microsecond matching latency.',
      'Mechanical sympathy: Cache-friendly memory layouts with zero GC pauses.',
      '100% deterministic replay from Write-Ahead Log (WAL).',
    ],
    calculations: [
      {
        metric: 'Single-Writer Advantage',
        formula: 'Zero lock contention + CPU cache line isolation = 6M ops/sec per core',
        result: 'Eliminates thread context switching overhead',
      },
      {
        metric: 'Order Book Lookup Complexity',
        formula: 'Best Bid / Best Ask lookup = O(1) pointer dereference',
        result: 'Sub-microsecond matching time',
      },
    ],
    services: [
      { id: 'trader', name: 'HFT Trader / Broker', role: 'Sends FIX 4.4 / Binary order', type: 'client', x: 10, y: 50, icon: 'TrendingUp', techStack: 'C++ / FPGA Client', details: 'Connects via dedicated TCP socket' },
      { id: 'gateway', name: 'FIX Protocol Gateway', role: 'Parses binary packets & checks risk', type: 'gateway', x: 35, y: 50, icon: 'Cpu', techStack: 'C++ / Netty', details: 'Validates margin; writes to Disruptor ring' },
      { id: 'disruptor', name: 'Disruptor Ring Buffer', role: 'Lock-free sequential event queue', type: 'queue', x: 60, y: 50, icon: 'Circle', techStack: 'LMAX Disruptor Pattern', details: 'Pre-allocated ring buffer with zero allocations' },
      { id: 'matching-core', name: 'Matching Engine Core', role: 'Single-threaded order book matcher', type: 'service', x: 85, y: 50, icon: 'Zap', techStack: 'C++ / Rust (Pinned to CPU Core)', details: 'Maintains Bid/Ask order books in L3 cache' },
    ],
    connections: [
      { id: 'c1', from: 'trader', to: 'gateway', label: 'NewOrderSingle (FIX 4.4)', protocol: 'TCP' },
      { id: 'c2', from: 'gateway', to: 'disruptor', label: 'Push to Lock-Free Ring Buffer', protocol: 'TCP' },
      { id: 'c3', from: 'disruptor', to: 'matching-core', label: 'Single-Writer Sequential Read', protocol: 'TCP' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Order Packet Ingestion via FIX Protocol',
        description: 'HFT trader submits Limit Order: BUY 100 shares AAPL at $180.50 via raw TCP socket.',
        fromNode: 'trader',
        toNode: 'gateway',
        protocol: 'TCP',
        payload: { side: 'BUY', symbol: 'AAPL', qty: 100, price: 180.50, traderId: 'HFT_CITADEL_01' },
        codeRef: { file: 'order_book.rs', lineHighlight: '20-35', funcName: 'process_order', codeExplanation: 'Zero-copy binary parsing of order fields into pre-allocated struct.' },
        stateChange: 'Gateway verifies account credit and publishes to Disruptor.',
      },
      {
        step: 2,
        title: 'Step 2: Lock-Free Ring Buffer Traversal',
        description: 'Disruptor ring buffer passes order event to the pinned CPU matching engine core without locks or context switches.',
        fromNode: 'gateway',
        toNode: 'matching-core',
        protocol: 'TCP',
        payload: { ringSequence: 49102834, latencyMicros: 0.4 },
        codeRef: { file: 'order_book.rs', lineHighlight: '40-55', funcName: 'match_limit_order', codeExplanation: 'Checks Best Ask pointer in memory. If Buy Price >= Best Ask, fills trade immediately.' },
        stateChange: 'Match executed against resting Ask at $180.50! Trade filled in 850 nanoseconds.',
      },
    ],
    codeFiles: [
      {
        name: 'order_book.rs',
        language: 'rust',
        role: 'Price-Time Priority Limit Order Book in Rust',
        code: `use std::collections::{BTreeMap, VecDeque};

#[derive(Debug, Clone)]
pub struct Order {
    pub id: u64,
    pub price: u64, // In cents (e.g. 18050 = $180.50)
    pub qty: u32,
}

pub struct OrderBook {
    pub bids: BTreeMap<u64, VecDeque<Order>>, // Descending price
    pub asks: BTreeMap<u64, VecDeque<Order>>, // Ascending price
}

impl OrderBook {
    pub fn new() -> Self {
        OrderBook {
            bids: BTreeMap::new(),
            asks: BTreeMap::new(),
        }
    }

    pub fn place_buy(&mut self, mut order: Order) -> Vec<(u64, u64, u32)> {
        let mut fills = Vec::new();

        while order.qty > 0 {
            // Find lowest available ask
            if let Some((&ask_price, queue)) = self.asks.iter_mut().next() {
                if ask_price > order.price { break; } // Cannot cross spread

                let mut matched_order = queue.front_mut().unwrap();
                let trade_qty = std::cmp::min(order.qty, matched_order.qty);

                order.qty -= trade_qty;
                matched_order.qty -= trade_qty;
                fills.push((order.id, matched_order.id, trade_qty));

                if matched_order.qty == 0 {
                    queue.pop_front();
                }
            } else {
                break;
            }
        }

        // If order still has remaining qty, insert resting into bids book
        if order.qty > 0 {
            self.bids.entry(order.price).or_default().push_back(order);
        }

        fills
    }
}`,
      },
    ],
    deepDive: {
      architectureSummary:
        'Financial exchanges achieve sub-microsecond performance through mechanical sympathy: single-threaded matching cores pinned to isolated CPU cores, lock-free ring buffers (Disruptor) that eliminate mutex contention, and pre-allocated order books stored entirely in CPU L3 cache.',
      databaseSchema: 'In-memory BTreeMap/SkipList with asynchronous binary commit log.',
      apiEndpoints: [{ method: 'POST', path: '/order/new', desc: 'Binary order submission' }],
      bottlenecksAndTradeoffs: [
        'Single-Threaded Throughput Ceiling: Because an individual order book is matched by a single core to eliminate locking, throughput per symbol is limited by single-core CPU frequency. High-volume exchanges shard across symbols (e.g., Apple on Core 1, Tesla on Core 2).',
      ],
    },
  },
  {
    id: 'rate-limiter',
    name: 'Distributed Rate Limiter Service',
    category: 'Financial & Reliability',
    difficulty: 'Intermediate',
    tagline: 'High-throughput rate limiter comparing Token Bucket, Leaky Bucket, and Redis Sliding Window Counter using atomic Lua scripts.',
    throughput: '500,000 checks/sec',
    latency: 'Sub-millisecond (< 1ms) rate limit evaluation',
    storageScale: 'Lightweight in-memory sliding window counters',
    overview:
      'A distributed rate-limiting service protecting downstream microservices from DDoS attacks, API abuse, and cascading failures. Evaluates client token consumption using Redis sorted sets (ZSET) sliding window counters and token bucket algorithms executed atomically via Lua scripts.',
    functionalReqs: [
      'Configurable rate limits by User ID, API Key, or IP Address (e.g., 100 req/min).',
      'Support burst allowances while maintaining steady average throughput.',
      'Return HTTP 429 Too Many Requests with Retry-After headers upon rate limit breach.',
    ],
    nonFunctionalReqs: [
      'Negligible latency overhead on the API path (< 1ms).',
      'Distributed synchronization across multi-region server fleets.',
    ],
    calculations: [
      {
        metric: 'Sliding Window Counter Formula',
        formula: 'Count = CurrentWindowCount + PreviousWindowCount * (1 - FractionOfWindowElapsed)',
        result: 'Smooths boundary spikes with minimal memory usage',
      },
    ],
    services: [
      { id: 'client', name: 'API Consumer', role: 'Sends API requests', type: 'client', x: 15, y: 50, icon: 'Cpu', techStack: 'Client App', details: 'Sends HTTP requests' },
      { id: 'gateway', name: 'API Gateway', role: 'Evaluates rate limit before proxying', type: 'gateway', x: 50, y: 50, icon: 'Shield', techStack: 'Kong / Envoy', details: 'Calls Redis Rate Limiter' },
      { id: 'redis', name: 'Redis Rate Limit Cluster', role: 'Maintains sliding window state', type: 'cache', x: 85, y: 50, icon: 'Zap', techStack: 'Redis 7.2', details: 'Executes atomic sliding window Lua script' },
    ],
    connections: [
      { id: 'c1', from: 'client', to: 'gateway', label: 'GET /api/v1/resource', protocol: 'HTTPS' },
      { id: 'c2', from: 'gateway', to: 'redis', label: 'EVALSHA sliding_window.lua', protocol: 'Redis' },
    ],
    animationSteps: [
      {
        step: 1,
        title: 'Step 1: Request Ingestion & Rate Limit Check',
        description: 'Client sends request. Gateway invokes Redis Lua script with user key and sliding window configuration.',
        fromNode: 'gateway',
        toNode: 'redis',
        protocol: 'Redis',
        payload: { key: 'ratelimit:user_456', windowMs: 60000, limit: 100, now: 1718029301000 },
        codeRef: { file: 'sliding_window.lua', lineHighlight: '1-16', funcName: 'sliding_window', codeExplanation: 'Evicts expired timestamps from sorted set; checks if remaining count < limit.' },
        stateChange: 'Count is 82 (< 100 limit). Redis returns 1 (Allowed) and remaining tokens.',
      },
    ],
    codeFiles: [
      {
        name: 'sliding_window.lua',
        language: 'lua',
        role: 'Redis Sliding Window Rate Limiter Lua Script',
        code: `local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clear_before = now - window

-- 1. Remove expired timestamps outside sliding window
redis.call('zremrangebyscore', key, '-inf', clear_before)

-- 2. Count requests in active window
local count = redis.call('zcard', key)

if count < limit then
    -- Allowed: record current timestamp with unique member
    redis.call('zadd', key, now, now .. ':' .. redis.call('incr', key .. ':seq'))
    redis.call('pexpire', key, window)
    return {1, limit - count - 1} -- {Allowed, Remaining}
else
    return {0, 0} -- {Rejected, Remaining}
end`,
      },
    ],
    deepDive: {
      architectureSummary:
        'The distributed rate limiter uses Redis sorted sets to store exact request timestamps per client. Atomic Lua scripts prevent race conditions when concurrent requests arrive simultaneously.',
      databaseSchema: 'Redis Sorted Set (ZSET) where score = Unix timestamp, member = timestamp:seq.',
      apiEndpoints: [{ method: 'POST', path: '/v1/check_limit', desc: 'Checks and increments rate limit' }],
      bottlenecksAndTradeoffs: [
        'Memory Consumption of Exact Sliding Logs: Storing a timestamp for every request in a Redis ZSET consumes ~250 bytes per request. For high-volume APIs, the Sliding Window Counter approximation reduces memory to just two integer keys per user.',
      ],
    },
  },
]
