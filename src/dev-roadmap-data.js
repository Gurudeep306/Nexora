/* ===== CodeRift – The Forge: Software Development Roadmap Data ===== */

/**
 * Each path represents a major software development domain.
 * Each path has milestones (stages), and each milestone has topics.
 * Topics contain: title, description, subtopics, estimated time, difficulty.
 *
 * Structure: { id, title, icon, color, description, milestones: [{ id, title, topics: [...] }] }
 */

const FORGE_PATHS = [
  /* ==================== 1. FRONTEND DEVELOPMENT ==================== */
  {
    id: 'frontend',
    title: 'Frontend Development',
    icon: 'globe',
    color: '#3b82f6',
    description: 'Master the art of building beautiful, responsive, and interactive user interfaces.',
    milestones: [
      {
        id: 'fe-foundations',
        title: 'Web Foundations',
        topics: [
          { id: 'html-core', title: 'HTML5 Essentials', desc: 'Semantic elements, forms, accessibility, SEO basics, meta tags, and structured markup.', time: '4 hrs', difficulty: 'beginner' },
          { id: 'css-core', title: 'CSS3 & Layout Systems', desc: 'Flexbox, Grid, responsive design, media queries, animations, transitions, and CSS custom properties.', time: '6 hrs', difficulty: 'beginner' },
          { id: 'js-fundamentals', title: 'JavaScript Fundamentals', desc: 'Variables, data types, functions, closures, prototypes, ES6+ features, async/await, and the event loop.', time: '8 hrs', difficulty: 'beginner' },
          { id: 'dom-events', title: 'DOM Manipulation & Events', desc: 'Querying elements, event delegation, bubbling/capturing, mutation observers, and performance-aware DOM updates.', time: '4 hrs', difficulty: 'beginner' },
        ]
      },
      {
        id: 'fe-frameworks',
        title: 'Frameworks & Libraries',
        topics: [
          { id: 'react', title: 'React', desc: 'Components, JSX, hooks, state management, context API, React Router, and the virtual DOM reconciliation algorithm.', time: '10 hrs', difficulty: 'intermediate' },
          { id: 'vue', title: 'Vue.js', desc: 'Composition API, reactivity system, Vuex/Pinia, Vue Router, and single-file components.', time: '8 hrs', difficulty: 'intermediate' },
          { id: 'angular', title: 'Angular', desc: 'TypeScript integration, modules, dependency injection, RxJS, services, and change detection strategies.', time: '10 hrs', difficulty: 'intermediate' },
          { id: 'nextjs', title: 'Next.js / Nuxt.js', desc: 'Server-side rendering, static site generation, API routes, middleware, and incremental static regeneration.', time: '6 hrs', difficulty: 'intermediate' },
        ]
      },
      {
        id: 'fe-styling',
        title: 'Modern Styling & UI',
        topics: [
          { id: 'tailwind', title: 'Tailwind CSS', desc: 'Utility-first workflow, JIT compiler, custom themes, plugins, and responsive design patterns.', time: '4 hrs', difficulty: 'beginner' },
          { id: 'sass-less', title: 'Sass / LESS', desc: 'Variables, nesting, mixins, functions, partials, and modular CSS architecture (BEM, SMACSS).', time: '3 hrs', difficulty: 'beginner' },
          { id: 'css-in-js', title: 'CSS-in-JS', desc: 'Styled-components, Emotion, CSS Modules, and runtime vs build-time styling approaches.', time: '3 hrs', difficulty: 'intermediate' },
          { id: 'design-systems', title: 'Design Systems', desc: 'Component libraries, tokens, Storybook, accessibility patterns, and design-to-code workflows.', time: '5 hrs', difficulty: 'intermediate' },
        ]
      },
      {
        id: 'fe-tooling',
        title: 'Build Tools & Performance',
        topics: [
          { id: 'bundlers', title: 'Vite / Webpack / esbuild', desc: 'Module bundling, code splitting, tree shaking, HMR, and build optimization strategies.', time: '5 hrs', difficulty: 'intermediate' },
          { id: 'typescript', title: 'TypeScript', desc: 'Type system, generics, utility types, declaration files, and migrating JS projects to TS.', time: '6 hrs', difficulty: 'intermediate' },
          { id: 'testing-fe', title: 'Frontend Testing', desc: 'Jest, React Testing Library, Cypress, Playwright, unit/integration/e2e testing strategies.', time: '5 hrs', difficulty: 'intermediate' },
          { id: 'web-perf', title: 'Web Performance', desc: 'Core Web Vitals, lazy loading, caching, CDN, image optimization, and profiling with Lighthouse.', time: '4 hrs', difficulty: 'advanced' },
        ]
      },
      {
        id: 'fe-advanced',
        title: 'Advanced Frontend',
        topics: [
          { id: 'state-mgmt', title: 'State Management', desc: 'Redux, Zustand, MobX, Jotai, signals, and choosing the right pattern for your app.', time: '5 hrs', difficulty: 'advanced' },
          { id: 'pwa', title: 'Progressive Web Apps', desc: 'Service workers, offline-first, push notifications, installability, and workbox.', time: '4 hrs', difficulty: 'advanced' },
          { id: 'a11y', title: 'Accessibility (a11y)', desc: 'WCAG guidelines, ARIA roles, screen reader testing, keyboard navigation, and inclusive design.', time: '4 hrs', difficulty: 'intermediate' },
          { id: 'webgl-3d', title: 'WebGL & 3D Graphics', desc: 'Three.js, shaders, scene graphs, animations, and building interactive 3D experiences for the web.', time: '6 hrs', difficulty: 'advanced' },
        ]
      }
    ]
  },

  /* ==================== 2. BACKEND DEVELOPMENT ==================== */
  {
    id: 'backend',
    title: 'Backend Development',
    icon: 'terminal',
    color: '#10b981',
    description: 'Build robust, scalable server-side applications and APIs.',
    milestones: [
      {
        id: 'be-fundamentals',
        title: 'Server Fundamentals',
        topics: [
          { id: 'http-protocol', title: 'HTTP & Networking', desc: 'HTTP/1.1, HTTP/2, HTTP/3, request/response lifecycle, headers, status codes, cookies, CORS, and TLS/SSL.', time: '4 hrs', difficulty: 'beginner' },
          { id: 'rest-api', title: 'RESTful API Design', desc: 'Resource modeling, HTTP methods, status codes, versioning, pagination, filtering, HATEOAS, and API documentation with OpenAPI/Swagger.', time: '5 hrs', difficulty: 'beginner' },
          { id: 'nodejs', title: 'Node.js & Express', desc: 'Event loop, non-blocking I/O, middleware pattern, routing, error handling, and building production-ready APIs.', time: '8 hrs', difficulty: 'beginner' },
          { id: 'python-be', title: 'Python (Django / Flask / FastAPI)', desc: 'WSGI/ASGI servers, ORM patterns, template engines, middleware, and building REST/GraphQL APIs.', time: '8 hrs', difficulty: 'intermediate' },
        ]
      },
      {
        id: 'be-databases',
        title: 'Databases',
        topics: [
          { id: 'sql', title: 'SQL & Relational Databases', desc: 'PostgreSQL, MySQL — schema design, normalization, joins, indexes, transactions, ACID properties, stored procedures.', time: '8 hrs', difficulty: 'beginner' },
          { id: 'nosql', title: 'NoSQL Databases', desc: 'MongoDB, Redis, DynamoDB, Cassandra — document stores, key-value, column-family, and graph databases.', time: '6 hrs', difficulty: 'intermediate' },
          { id: 'orm', title: 'ORMs & Query Builders', desc: 'Prisma, Sequelize, TypeORM, SQLAlchemy, Drizzle — migrations, relationships, and query optimization.', time: '5 hrs', difficulty: 'intermediate' },
          { id: 'db-design', title: 'Database Design Patterns', desc: 'Normalization vs denormalization, indexing strategies, partitioning, sharding, replication, and data modeling.', time: '5 hrs', difficulty: 'advanced' },
        ]
      },
      {
        id: 'be-auth',
        title: 'Authentication & Security',
        topics: [
          { id: 'auth-patterns', title: 'Authentication Patterns', desc: 'Session-based, JWT, OAuth2.0, OpenID Connect, SAML, API keys, and multi-factor authentication.', time: '6 hrs', difficulty: 'intermediate' },
          { id: 'security', title: 'Application Security', desc: 'OWASP Top 10, XSS, CSRF, SQL injection, rate limiting, input validation, and security headers.', time: '5 hrs', difficulty: 'intermediate' },
          { id: 'encryption', title: 'Encryption & Hashing', desc: 'Symmetric/asymmetric encryption, bcrypt, argon2, AES, RSA, digital signatures, and key management.', time: '4 hrs', difficulty: 'advanced' },
        ]
      },
      {
        id: 'be-advanced',
        title: 'Advanced Backend',
        topics: [
          { id: 'graphql', title: 'GraphQL', desc: 'Schema definition, resolvers, subscriptions, DataLoader, federation, and Apollo/Hasura integration.', time: '6 hrs', difficulty: 'intermediate' },
          { id: 'websockets', title: 'WebSockets & Real-Time', desc: 'Socket.IO, SSE, long polling, pub/sub patterns, and building real-time applications.', time: '4 hrs', difficulty: 'intermediate' },
          { id: 'microservices', title: 'Microservices Architecture', desc: 'Service decomposition, API gateway, gRPC, service discovery, saga pattern, and event-driven communication.', time: '8 hrs', difficulty: 'advanced' },
          { id: 'message-queues', title: 'Message Queues & Event Streaming', desc: 'RabbitMQ, Kafka, Redis Streams, SQS — pub/sub, work queues, dead letter queues, and backpressure handling.', time: '5 hrs', difficulty: 'advanced' },
          { id: 'serverless', title: 'Serverless & Edge Computing', desc: 'AWS Lambda, Cloudflare Workers, Vercel Edge Functions, cold starts, and serverless architecture patterns.', time: '5 hrs', difficulty: 'advanced' },
        ]
      }
    ]
  },

  /* ==================== 3. DEVOPS & CLOUD ==================== */
  {
    id: 'devops',
    title: 'DevOps & Cloud',
    icon: 'rocket',
    color: '#f59e0b',
    description: 'Automate, deploy, and scale applications with modern infrastructure practices.',
    milestones: [
      {
        id: 'devops-foundations',
        title: 'Foundations',
        topics: [
          { id: 'linux-cli', title: 'Linux & Command Line', desc: 'Shell scripting, file permissions, process management, networking commands, systemd, cron, and SSH.', time: '6 hrs', difficulty: 'beginner' },
          { id: 'git', title: 'Git & Version Control', desc: 'Branching strategies (GitFlow, trunk-based), rebasing, cherry-picking, hooks, submodules, and monorepo management.', time: '5 hrs', difficulty: 'beginner' },
          { id: 'networking', title: 'Networking Fundamentals', desc: 'TCP/IP, DNS, load balancers, reverse proxies, firewalls, VPNs, and the OSI model.', time: '5 hrs', difficulty: 'beginner' },
        ]
      },
      {
        id: 'devops-containers',
        title: 'Containers & Orchestration',
        topics: [
          { id: 'docker', title: 'Docker', desc: 'Dockerfiles, multi-stage builds, docker-compose, networking, volumes, image optimization, and security scanning.', time: '6 hrs', difficulty: 'intermediate' },
          { id: 'kubernetes', title: 'Kubernetes', desc: 'Pods, services, deployments, config maps, secrets, ingress, Helm charts, and cluster management.', time: '10 hrs', difficulty: 'advanced' },
          { id: 'container-security', title: 'Container Security', desc: 'Image scanning, rootless containers, network policies, pod security, and runtime security.', time: '4 hrs', difficulty: 'advanced' },
        ]
      },
      {
        id: 'devops-cicd',
        title: 'CI/CD & Automation',
        topics: [
          { id: 'cicd', title: 'CI/CD Pipelines', desc: 'GitHub Actions, GitLab CI, Jenkins, CircleCI — build, test, deploy automation, and artifact management.', time: '6 hrs', difficulty: 'intermediate' },
          { id: 'iac', title: 'Infrastructure as Code', desc: 'Terraform, Pulumi, CloudFormation, Ansible — declarative infrastructure, state management, and drift detection.', time: '6 hrs', difficulty: 'intermediate' },
          { id: 'gitops', title: 'GitOps', desc: 'ArgoCD, Flux, declarative deployments, config management, and progressive delivery strategies.', time: '4 hrs', difficulty: 'advanced' },
        ]
      },
      {
        id: 'devops-cloud',
        title: 'Cloud Platforms',
        topics: [
          { id: 'aws', title: 'AWS', desc: 'EC2, S3, RDS, Lambda, ECS, CloudFront, IAM, VPC, and architecting for the AWS Well-Architected Framework.', time: '10 hrs', difficulty: 'intermediate' },
          { id: 'gcp', title: 'Google Cloud Platform', desc: 'Compute Engine, Cloud Functions, GKE, BigQuery, Cloud Storage, and GCP networking.', time: '8 hrs', difficulty: 'intermediate' },
          { id: 'azure', title: 'Microsoft Azure', desc: 'Azure App Service, Functions, AKS, Cosmos DB, Azure DevOps, and Active Directory integration.', time: '8 hrs', difficulty: 'intermediate' },
        ]
      },
      {
        id: 'devops-monitoring',
        title: 'Monitoring & Observability',
        topics: [
          { id: 'monitoring', title: 'Monitoring & Alerting', desc: 'Prometheus, Grafana, Datadog, CloudWatch — metrics collection, dashboards, SLIs/SLOs, and alerting strategies.', time: '5 hrs', difficulty: 'intermediate' },
          { id: 'logging', title: 'Centralized Logging', desc: 'ELK Stack, Fluentd, CloudWatch Logs, structured logging, log aggregation, and correlation.', time: '4 hrs', difficulty: 'intermediate' },
          { id: 'tracing', title: 'Distributed Tracing', desc: 'OpenTelemetry, Jaeger, Zipkin — trace propagation, span analysis, and performance troubleshooting.', time: '4 hrs', difficulty: 'advanced' },
        ]
      }
    ]
  },

  /* ==================== 4. SYSTEM DESIGN ==================== */
  {
    id: 'system-design',
    title: 'System Design',
    icon: 'graph',
    color: '#a855f7',
    description: 'Design large-scale distributed systems that handle millions of users.',
    milestones: [
      {
        id: 'sd-fundamentals',
        title: 'Core Concepts',
        topics: [
          { id: 'scalability', title: 'Scalability', desc: 'Horizontal vs vertical scaling, stateless design, auto-scaling, capacity planning, and bottleneck analysis.', time: '4 hrs', difficulty: 'intermediate' },
          { id: 'load-balancing', title: 'Load Balancing', desc: 'Round-robin, least connections, consistent hashing, L4/L7 load balancers, health checks, and session affinity.', time: '3 hrs', difficulty: 'intermediate' },
          { id: 'caching', title: 'Caching Strategies', desc: 'Cache-aside, write-through, write-behind, TTL, eviction policies (LRU, LFU), CDN caching, and cache invalidation.', time: '4 hrs', difficulty: 'intermediate' },
          { id: 'cap-theorem', title: 'CAP Theorem & Consistency', desc: 'Consistency, availability, partition tolerance trade-offs, eventual consistency, strong consistency, and PACELC theorem.', time: '3 hrs', difficulty: 'advanced' },
        ]
      },
      {
        id: 'sd-patterns',
        title: 'Design Patterns',
        topics: [
          { id: 'design-patterns', title: 'Software Design Patterns', desc: 'Creational (Singleton, Factory, Builder), Structural (Adapter, Proxy, Decorator), Behavioral (Observer, Strategy, Command).', time: '8 hrs', difficulty: 'intermediate' },
          { id: 'api-patterns', title: 'API Design Patterns', desc: 'Rate limiting, circuit breakers, retries with backoff, bulkhead, saga pattern, and API versioning strategies.', time: '5 hrs', difficulty: 'intermediate' },
          { id: 'event-driven', title: 'Event-Driven Architecture', desc: 'Event sourcing, CQRS, domain events, eventual consistency, and building event-driven microservices.', time: '6 hrs', difficulty: 'advanced' },
        ]
      },
      {
        id: 'sd-data',
        title: 'Data Systems',
        topics: [
          { id: 'data-partitioning', title: 'Data Partitioning & Sharding', desc: 'Hash-based, range-based, geographic partitioning, resharding strategies, and cross-shard queries.', time: '5 hrs', difficulty: 'advanced' },
          { id: 'replication', title: 'Replication & Consensus', desc: 'Leader-follower, multi-leader, leaderless replication, Raft, Paxos, and quorum-based systems.', time: '5 hrs', difficulty: 'advanced' },
          { id: 'search', title: 'Search Systems', desc: 'Elasticsearch, inverted indexes, full-text search, ranking algorithms, and search relevance tuning.', time: '4 hrs', difficulty: 'advanced' },
        ]
      },
      {
        id: 'sd-case-studies',
        title: 'Real-World Case Studies',
        topics: [
          { id: 'url-shortener', title: 'Design a URL Shortener', desc: 'Base62 encoding, hash collisions, analytics, rate limiting, and scaling to billions of URLs.', time: '3 hrs', difficulty: 'intermediate' },
          { id: 'chat-system', title: 'Design a Chat System', desc: 'WebSocket connections, message ordering, delivery guarantees, presence system, and group chat architecture.', time: '4 hrs', difficulty: 'advanced' },
          { id: 'newsfeed', title: 'Design a News Feed', desc: 'Fan-out on write vs read, ranking algorithms, real-time updates, and content moderation at scale.', time: '4 hrs', difficulty: 'advanced' },
          { id: 'video-platform', title: 'Design a Video Streaming Platform', desc: 'Video transcoding, adaptive bitrate streaming, CDN, recommendation engine, and content delivery at scale.', time: '5 hrs', difficulty: 'advanced' },
        ]
      }
    ]
  },

  /* ==================== 5. MOBILE DEVELOPMENT ==================== */
  {
    id: 'mobile',
    title: 'Mobile Development',
    icon: 'cpu',
    color: '#ec4899',
    description: 'Build native and cross-platform mobile applications.',
    milestones: [
      {
        id: 'mob-cross',
        title: 'Cross-Platform',
        topics: [
          { id: 'react-native', title: 'React Native', desc: 'Components, navigation, native modules, Expo, animations, and bridging to native APIs.', time: '8 hrs', difficulty: 'intermediate' },
          { id: 'flutter', title: 'Flutter', desc: 'Dart language, widget tree, state management (BLoC, Riverpod), platform channels, and Material/Cupertino design.', time: '8 hrs', difficulty: 'intermediate' },
        ]
      },
      {
        id: 'mob-native',
        title: 'Native Development',
        topics: [
          { id: 'ios-swift', title: 'iOS Development (Swift)', desc: 'SwiftUI, UIKit, Core Data, Combine, App Store deployment, and Apple design guidelines.', time: '10 hrs', difficulty: 'intermediate' },
          { id: 'android-kotlin', title: 'Android Development (Kotlin)', desc: 'Jetpack Compose, MVVM, Room, Coroutines, Play Store deployment, and Material Design 3.', time: '10 hrs', difficulty: 'intermediate' },
        ]
      },
      {
        id: 'mob-advanced',
        title: 'Advanced Mobile',
        topics: [
          { id: 'mobile-perf', title: 'Mobile Performance', desc: 'Memory management, battery optimization, rendering performance, app startup time, and profiling tools.', time: '5 hrs', difficulty: 'advanced' },
          { id: 'offline-sync', title: 'Offline-First & Data Sync', desc: 'Local databases, conflict resolution, background sync, push notifications, and real-time data strategies.', time: '5 hrs', difficulty: 'advanced' },
          { id: 'mobile-security', title: 'Mobile Security', desc: 'Secure storage, certificate pinning, code obfuscation, biometric auth, and secure communication.', time: '4 hrs', difficulty: 'advanced' },
        ]
      }
    ]
  },

  /* ==================== 6. DATA ENGINEERING ==================== */
  {
    id: 'data-engineering',
    title: 'Data Engineering',
    icon: 'dataset',
    color: '#06b6d4',
    description: 'Build data pipelines, warehouses, and analytics infrastructure.',
    milestones: [
      {
        id: 'de-foundations',
        title: 'Data Foundations',
        topics: [
          { id: 'data-modeling', title: 'Data Modeling', desc: 'Star schema, snowflake schema, denormalization, data vaults, slowly changing dimensions, and entity relationships.', time: '5 hrs', difficulty: 'intermediate' },
          { id: 'etl-elt', title: 'ETL / ELT Pipelines', desc: 'Apache Airflow, dbt, Luigi, data extraction, transformation, loading, and pipeline orchestration.', time: '6 hrs', difficulty: 'intermediate' },
          { id: 'sql-advanced', title: 'Advanced SQL', desc: 'Window functions, CTEs, recursive queries, query optimization, explain plans, and performance tuning.', time: '5 hrs', difficulty: 'intermediate' },
        ]
      },
      {
        id: 'de-bigdata',
        title: 'Big Data Technologies',
        topics: [
          { id: 'spark', title: 'Apache Spark', desc: 'RDDs, DataFrames, Spark SQL, MLlib, structured streaming, and cluster deployment modes.', time: '8 hrs', difficulty: 'advanced' },
          { id: 'kafka', title: 'Apache Kafka', desc: 'Topics, partitions, consumer groups, Kafka Streams, Connect, exactly-once semantics, and schema registry.', time: '6 hrs', difficulty: 'advanced' },
          { id: 'data-lakes', title: 'Data Lakes & Warehouses', desc: 'Snowflake, BigQuery, Redshift, Delta Lake, Iceberg, data lakehouse architecture, and data governance.', time: '6 hrs', difficulty: 'advanced' },
        ]
      }
    ]
  },

  /* ==================== 7. SECURITY ==================== */
  {
    id: 'security',
    title: 'Cybersecurity',
    icon: 'shield',
    color: '#ef4444',
    description: 'Protect applications and systems from threats and vulnerabilities.',
    milestones: [
      {
        id: 'sec-fundamentals',
        title: 'Security Fundamentals',
        topics: [
          { id: 'owasp', title: 'OWASP Top 10', desc: 'Injection, broken authentication, sensitive data exposure, XXE, broken access control, misconfigurations, XSS, insecure deserialization.', time: '5 hrs', difficulty: 'beginner' },
          { id: 'crypto-basics', title: 'Cryptography Basics', desc: 'Symmetric/asymmetric encryption, hashing, digital signatures, certificates, PKI, and TLS handshake.', time: '5 hrs', difficulty: 'intermediate' },
          { id: 'secure-coding', title: 'Secure Coding Practices', desc: 'Input validation, output encoding, parameterized queries, least privilege, defense in depth, and security testing.', time: '5 hrs', difficulty: 'intermediate' },
        ]
      },
      {
        id: 'sec-advanced',
        title: 'Advanced Security',
        topics: [
          { id: 'pen-testing', title: 'Penetration Testing', desc: 'Reconnaissance, vulnerability scanning, exploitation, post-exploitation, reporting, and ethical hacking methodologies.', time: '8 hrs', difficulty: 'advanced' },
          { id: 'cloud-security', title: 'Cloud Security', desc: 'IAM policies, VPC security, encryption at rest/in transit, compliance (SOC2, GDPR), and security automation.', time: '6 hrs', difficulty: 'advanced' },
          { id: 'devsecops', title: 'DevSecOps', desc: 'SAST, DAST, SCA, secret scanning, security gates in CI/CD, and shift-left security culture.', time: '5 hrs', difficulty: 'advanced' },
        ]
      }
    ]
  },

  /* ==================== 8. SOFTWARE ENGINEERING ==================== */
  {
    id: 'software-eng',
    title: 'Software Engineering',
    icon: 'wrench',
    color: '#8b5cf6',
    description: 'Master the craft of writing clean, maintainable, and well-tested software.',
    milestones: [
      {
        id: 'se-principles',
        title: 'Principles & Practices',
        topics: [
          { id: 'clean-code', title: 'Clean Code', desc: 'Naming conventions, function design, SOLID principles, DRY, KISS, YAGNI, and code smells.', time: '5 hrs', difficulty: 'beginner' },
          { id: 'testing', title: 'Testing Strategies', desc: 'Unit testing, integration testing, e2e testing, TDD, BDD, mocking, test doubles, and code coverage.', time: '6 hrs', difficulty: 'intermediate' },
          { id: 'refactoring', title: 'Refactoring', desc: 'Extract method, inline variable, replace conditional with polymorphism, and safe refactoring techniques.', time: '4 hrs', difficulty: 'intermediate' },
          { id: 'code-review', title: 'Code Review', desc: 'Review checklists, giving constructive feedback, PR best practices, and maintaining code quality standards.', time: '3 hrs', difficulty: 'beginner' },
        ]
      },
      {
        id: 'se-architecture',
        title: 'Architecture',
        topics: [
          { id: 'clean-arch', title: 'Clean Architecture', desc: 'Dependency rule, use cases, entities, interface adapters, and hexagonal architecture.', time: '5 hrs', difficulty: 'advanced' },
          { id: 'ddd', title: 'Domain-Driven Design', desc: 'Bounded contexts, aggregates, entities, value objects, repositories, and ubiquitous language.', time: '6 hrs', difficulty: 'advanced' },
          { id: 'monolith-micro', title: 'Monolith vs Microservices', desc: 'When to choose each, migration strategies, strangler fig pattern, and modular monolith approach.', time: '4 hrs', difficulty: 'advanced' },
        ]
      },
      {
        id: 'se-processes',
        title: 'Processes & Collaboration',
        topics: [
          { id: 'agile', title: 'Agile & Scrum', desc: 'Sprints, standups, retrospectives, user stories, story points, velocity, and kanban.', time: '4 hrs', difficulty: 'beginner' },
          { id: 'documentation', title: 'Technical Documentation', desc: 'API docs, architecture decision records (ADRs), runbooks, README best practices, and documentation as code.', time: '3 hrs', difficulty: 'beginner' },
          { id: 'open-source', title: 'Open Source Contribution', desc: 'Finding projects, understanding codebases, writing good PRs, issue templates, and community guidelines.', time: '3 hrs', difficulty: 'beginner' },
        ]
      }
    ]
  }
];

module.exports = FORGE_PATHS;
