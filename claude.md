# General instructions for completing tasks:

* Before starting implementation, provide an ELI5 explanation of what you're about to do
* Once implemented:
 	- Make sure the tests pass, and the program builds/runs
 	- Commit the changes to the repository with a clear commit message.
   - Explain what you did and what should now be possible. If I am able to manually test the latest change myself to make sure it works, give me instructions on how I can do that.
* Pause and wait for user review or feedback.

# Writing code

- We prefer simple, clean, maintainable solutions over clever or complex ones, even if the latter are more concise or performant. Readability and maintainability are primary concerns.
- Write code that works today but can grow tomorrow. Avoid premature optimization, but don't paint yourself into architectural corners.
- Make the smallest reasonable changes to get to the desired outcome. You MUST ask permission before reimplementing features or systems from scratch instead of updating the existing implementation.
- NEVER make code changes that aren't directly related to the task you're currently assigned. If you notice something that should be fixed but is unrelated to your current task, document it as a new item in `todo.md` with priority level (P0/P1/P2).
- Only remove comments that are demonstrably incorrect or misleading.
- All code files should start with a brief 2 line comment explaining what the file does. Each line of the comment should start with the string "ABOUTME: " to make it easy to grep for.
- When writing comments, avoid referring to temporal context about refactors or recent changes. Comments should be evergreen and describe the code as it is, not how it evolved or was recently changed.
- Handle errors gracefully with clear, actionable messages. Fail fast for programming errors, recover gracefully for user/external errors.
- Minimize external dependencies. When adding new dependencies, justify the choice and document the decision.
- Avoid mocks for core business logic, but they're acceptable for external APIs during development.
- When you are trying to fix a bug or compilation error or any other issue, YOU MUST NEVER throw away the old implementation and rewrite without explicit permission from the user. If you are going to do this, YOU MUST STOP and get explicit permission from the user.
- NEVER name things as 'improved' or 'new' or 'enhanced', etc. Code naming should be evergreen. What is new today will be "old" someday.
- Update README.md and CLAUDE.md when adding new features or changing how the project works. Keep setup/usage instructions current.

# Getting help

- ALWAYS ask for clarification rather than making assumptions.
- If you're having trouble with something, it's ok to stop and ask for help. Especially if it's something your human might be better at.

# Testing

- All projects need comprehensive tests. Start with the most critical test type for the project's scope and add others as complexity grows.
- Tests MUST cover the functionality being implemented.
- NEVER ignore the output of the system or the tests - Logs and messages often contain CRITICAL information.
- TEST OUTPUT MUST BE PRISTINE TO PASS.
- If the logs are supposed to contain errors, capture and test it.
- IF TESTS TIME OUT: Use `npx vitest --run` instead of `npm test` to avoid timeout issues when running tests programmatically. The `--run` flag executes tests once and exits, while the default behavior enters watch mode waiting for file changes.