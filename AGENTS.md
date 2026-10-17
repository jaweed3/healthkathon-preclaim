# Coding Standards for AI Agents

## 1. Architecture and Modularity

- Follow the existing project architecture and conventions.
- Each function, class, and module must have a clear, cohesive responsibility.
- Separate business logic, data access, validation, presentation, and infrastructure concerns.
- Keep functions focused on one logical task.
- Extract reusable logic only when it improves clarity, reuse, or testability.
- Avoid god classes, god functions, unnecessary abstractions, and circular dependencies.
- Do not introduce a new architectural pattern without a clear reason.

## 2. Readability

- Use one logical operation per line.
- Never compress multiple statements into a single line using semicolons.
- Avoid nested ternary expressions and deeply nested comprehensions.
- Use intermediate variables when they make data transformations easier to understand.
- Prefer early returns over deeply nested conditionals.
- Keep control flow explicit and easy to follow.
- Use descriptive names instead of cryptic abbreviations.
- Follow the language's standard formatting conventions.

## 3. Function Size and Complexity

- Aim for functions that fit within approximately 20–40 lines of executable code.
- Treat functions exceeding 40 lines as a signal to review, not an automatic violation.
- Avoid functions that mix multiple independent responsibilities.
- Reduce unnecessary nesting and branching.
- Extract cohesive helper functions when they make the code easier to understand or test.

## 4. Change Management

- Inspect the relevant files and dependencies before editing.
- Understand the existing architecture before introducing changes.
- Make small, focused changes instead of rewriting unrelated code.
- Do not modify unrelated files or introduce unnecessary dependencies.
- Preserve existing behavior unless a change is explicitly required.
- Explain significant architectural decisions.

## 5. Verification

- Run the project's formatter and linter.
- Run relevant unit tests and integration tests.
- Add or update tests for changed behavior.
- Review the final diff for duplication, unnecessary complexity, and unrelated modifications.
- Never claim a test passed unless it was actually executed successfully.

## 6. Completion Report

After implementation, report:

- What changed and why.
- Files created, modified, or deleted.
- Architectural decisions and trade-offs.
- Tests, linting, and formatting results.
- Known limitations or remaining work.

If a requirement conflicts with the existing architecture, explain the conflict before making a significant structural change.
