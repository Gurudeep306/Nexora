# Dry-run test programs (Go, Rust, C#, Kotlin, Swift)

Each program must print exactly the same with the dry run as without it.
A `<name>.in` file next to a program is its input.

Run them through the real public runners (needs the agent proxy preload in
this container, see docs/HANDOFF.md section 7):

    NODE_OPTIONS="-r /path/preload.js" node scripts/dryrun-suites/run.js <lang> [engine]

`lang` is go, rust, csharp, kotlin or swift; `engine` is wandbox, godbolt,
paiza or kotlin (default: the language's normal chain). Each line says OK or
BAD, the runner, the verdict and how many steps were traced.
