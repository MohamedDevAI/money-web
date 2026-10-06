# Code Style Guide

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `FinanceSummaryCards.tsx` |
| Hooks | camelCase, `use` prefix | `useTheme.ts` |
| Utilities | camelCase | `formatCurrency.ts` |
| Types / Interfaces | PascalCase | `BackendHealth`, `Transaction` |
| CSS classes | kebab-case | `finance-kpi-card` |
| Constants | UPPER_SNAKE_CASE | `STORAGE_KEYS` |

## File Organization

- Each component lives in its own `.tsx` file.
- If a component needs sub-components, create a `ComponentNameParts/` directory next to it and add an `index.ts` barrel file.
- Group related files by feature, not by type.

## Component Rules

- Keep components under **200 lines**.
- Accept only **typed props** — no `any` or implicit types.
- Avoid inline styles; use CSS classes instead.
- Do not mix data-fetching and rendering in the same component — use a custom hook.

## Documentation

- Every **exported** symbol (component, hook, utility, type) must have a TSDoc comment.
- Use `/** ... */` style for multi-line and `/** ... */` for single-line.
- Props interfaces must document every field.

## Imports

- Group imports: React → external libraries → internal (`../../`) → styles.
- Do not use relative paths that go up more than two levels — prefer absolute paths via path aliases if needed.

## State Management

- Server state: **React Query** (`@tanstack/react-query`).
- Local UI state: `useState` / `useReducer` inside the component or hook.
- Global UI state (theme, auth): React Context via a dedicated `src/context/` file.

## Testing

- Test framework: **Vitest** + **@testing-library/react**.
- Write at least one smoke test per top-level component.
- Mock API calls using `vi.fn()` or `msw`.
- Place tests in `src/__tests__/` mirroring the `src/` structure.
