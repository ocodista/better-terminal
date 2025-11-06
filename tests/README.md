# Testing Strategy

Tests focus on **what the code does** (behavior) rather than **how it does it** (implementation).

## Test Organization

### Unit Tests
Location: `src/**/*.test.ts`

Tests individual utility functions. Focus on behavior and real-world outcomes.

```bash
bun test
bun test --coverage
```

### Integration Tests
Location: `tests/integration/`

Verify complete installation in Docker containers.

```bash
bun run test:integration
bun run test:integration:ubuntu
bun run test:integration:alpine
```

## Writing Tests

### ✅ Test Behavior

```typescript
// Good: Tests outcomes
test('executes commands and returns output', async () => {
  const result = await shell.exec('echo hello', { silent: true });

  expect(result.success).toBe(true);
  expect(result.stdout.trim()).toBe('hello');
});

// Good: Tests real scenarios
test('stops on first failure by default', async () => {
  const success = await shell.execMany(
    ['echo success', 'command-that-fails', 'echo third'],
    { silent: true }
  );

  expect(success).toBe(false);
});
```

### ❌ Avoid Implementation Details

```typescript
// Bad: Tests internals
test('calls console.log with formatted string', () => {
  const spy = spyOn(console, 'log');
  logger.info('test');
  expect(spy).toHaveBeenCalledWith('...');
});

// Bad: Tests private state
test('sets internal _state property', () => {
  expect(myClass._state).toBe('initialized');
});
```

## Test Categories

### Platform Detection
- Detects same platform/arch across calls
- Matches platform helpers to detected platform
- Verifies home directory exists and is readable
- Confirms shell executable works

### Logger
- Includes expected content in messages
- Distinguishes log levels with different output
- Starts, stops, and fails spinners
- Applies formatting with color codes

### Shell Execution
- Runs commands and produces output
- Detects and reports failures
- Respects working directory and environment
- Fails gracefully on non-existent commands
- Creates files with downloaded content

## Benefits

- **Refactor safely**: Change implementation without breaking tests
- **Real confidence**: Verify actual user-facing behavior
- **Better docs**: Show how code works
- **Fewer brittle tests**: Avoid coupling to internals
- **Meaningful failures**: Breaks indicate real issues

## CI/CD

GitHub Actions runs:
- Type checking
- Unit tests (macOS, Ubuntu)
- Integration tests (Ubuntu, Alpine containers)
- Build verification (all platforms)

Configuration: `.github/workflows/ci.yml`
