# Commit Standard

All commits in this repository MUST follow the file-level detail format to ensure full transparency of the development history.

## Format
```
type(scope): short description

- [MODULE/SCOPE]
  - path/to/file: Description of the specific change, logic update, or new implementation.
  - path/to/file: Details on why this was changed or how it impacts the system.
```

## Guidelines
1. **Clear Header**: Start with a concise type (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`) and scope.
2. **Technical Per-File Detail**: List each modified or created file and describe the exact technical change (e.g., "Updated interface", "Constrained date selection", "Fixed type mismatch").
3. **Reasoning**: Briefly explain *why* the change was made if it's not obvious from the technical description.
4. **Transparency**: Mention added dependencies, schema changes, or structural updates to ensure the entire team understands the impact of the commit.
