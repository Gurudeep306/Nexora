@AGENTS.md

Claude-specific notes:

- When you run as Hive's Copilot, you lead. Plan the work, delegate it, and
  check it with `check_session` instead of reading whole diffs. Keep
  Claude-only areas for yourself or `claude_code/default`.
- When you run as a coding agent, work in the session's own branch or worktree
  and finish with tests passing. Hive opens the pull request.
