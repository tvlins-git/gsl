---
name: regenerate-test-coverage
description: Acts as an expert testing agent that regenerates and updates the project's Jest test coverage when features change. Use whenever a new feature is built or a file under `lib/` or `components/` is added or modified, or when the user asks to regenerate, update, or add test coverage.
---

# Regenerate Test Coverage

You are an expert testing agent. Whenever a new feature is built or existing behavior changes, regenerate the project's test coverage so the new/changed behavior is tested and the suite stays green.

## When to apply
- Immediately after implementing or modifying a feature.
- When any file under `lib/` or `components/` is added or changed (these are the coverage targets in `jest.config.js`).
- When the user asks to regenerate, update, add, or improve tests/coverage.

## Test stack
- Jest with the `jest-expo` preset (`jest.config.js`); global setup in `jest.setup.js`.
- `@testing-library/react-native` (`render`, `screen`, `fireEvent`).
- `@/` path alias maps to the repo root.
- Coverage is collected from `lib/**` and `components/**` (`collectCoverageFrom`).

## Where tests live
- `__tests__/unit/*.test.ts` — pure logic in `lib/`
- `__tests__/components/*.test.tsx` — components in `components/`
- `__tests__/integration/*.test.ts` — multi-module flows
- `__tests__/factories/index.ts` — data builders: `buildMember`, `buildPoll`, `buildMessage`, `buildHostAssignment`

## Commands
- All tests: `npm test`
- One file: `npx jest __tests__/components/HostMonthRow.test.tsx`
- Coverage report: `npm test -- --coverage`
- Lint (also covers test files): `npm run lint`
- Typecheck (excludes `__tests__`): `npm run typecheck`

## Workflow
```
- [ ] 1. Identify what changed: which feature, and which lib/ + components/ files
- [ ] 2. Find existing tests for those files; decide add vs. update
- [ ] 3. Write/adjust tests using the conventions below
- [ ] 4. Run the affected file(s); fix until green
- [ ] 5. Run the full suite: npm test
- [ ] 6. Run npm test -- --coverage; confirm changed files are covered (happy path + edge cases)
- [ ] 7. Run npm run lint
```

## Conventions (match existing tests)
- Query by `testID` (`screen.getByTestId(...)`, `queryByTestId(...)` for absence) and drive interactions with `fireEvent.press(...)`.
- Build model data with the factories in `__tests__/factories` — don't hand-roll objects.
- Prefer testing pure exported logic directly (e.g., scoring/summary/formatting helpers in `lib/`).
- `@/lib/supabase`, `expo-font`, `expo-asset`, `expo-constants`, and the datetime picker are already mocked globally in `jest.setup.js`. Don't re-mock supabase per test; extend the global mock if a test needs a specific return value.
- Native/Expo view modules that don't render under jsdom must be mocked inside the test file. `jest.mock` factories are hoisted, so `require` modules inside them (not top-level imports):
  - `@react-native-picker/picker` → stub `Picker` / `Picker.Item`.
  - `expo-symbols` → `SymbolView` returns a `<View/>`.
- Many `lib/` functions branch on local vs. backend mode (`isLocalMode()` / `localStore` vs. `supabase`). Cover the local path via the global supabase mock and assert the branch under test.

## Scope
- Cover the new/changed behavior and its edge cases; don't rewrite unrelated tests or add broad test infrastructure unless asked.
- Match the style and granularity of neighboring tests.
- Every added/updated test must pass deterministically before you finish.

## Component test skeleton
```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MyComponent } from '@/components/MyComponent';
import { buildMember } from '../factories';

jest.mock('expo-symbols', () => {
  const { View } = require('react-native');
  return { SymbolView: () => <View /> };
});

describe('MyComponent', () => {
  it('calls onAction when pressed', () => {
    const onAction = jest.fn();
    render(<MyComponent member={buildMember()} onAction={onAction} />);
    fireEvent.press(screen.getByTestId('my-action'));
    expect(onAction).toHaveBeenCalled();
  });
});
```
