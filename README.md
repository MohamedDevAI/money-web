# Personal Tracker — Frontend

A productivity and finance management web application built with React, TypeScript, Vite, and React Query.

## Features

- **Life OS** — Tasks (Kanban), Habits (streak tracker), Goals, and an Overview dashboard.
- **Money OS** — Transactions ledger, borrow-repay tracker, planned expenses, and investment portfolio.
- Direct Server API persistence: Spring Boot + MongoDB Atlas backend REST APIs with React Query.
- Light / dark theme with full CSS variable theming.

## Project Structure

```
src/
├── components/          # UI components, organized by feature
│   ├── common/          # Reusable generic components (e.g. ConfirmDeleteModal)
│   └── life_os/         # Feature-specific components
│       ├── finances/    # Finance feature (transactions, KPI cards, modals)
│       ├── goals/       # Goals feature
│       ├── habits/      # Habits feature
│       └── tasks/       # Tasks feature
├── hooks/               # Custom React hooks (useTheme, useBackendHealth, etc.)
├── pages/               # Top-level page components (LifeOSHub, MoneyHub)
├── services/            # API layer (Axios client connected to Spring Boot REST endpoints)
├── types/               # Shared TypeScript interfaces and types
├── utils/               # Pure helper functions (formatters, date helpers, constants)
└── __tests__/           # Vitest + Testing Library test files
```

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

### Run tests

```bash
npm test
```

### Lint and format

```bash
npm run lint      # ESLint with auto-fix
npm run format    # Prettier write
```

### Build for production

```bash
npm run build
```

## Code Style

- TypeScript strict mode is enabled.
- All exported symbols have JSDoc/TSDoc comments.
- Components are kept small and focused (≤ 200 lines). Large components use sub-components in a `ComponentNameParts/` directory.
- Custom hooks live in `src/hooks/` and encapsulate all side effects.
- Formatting is enforced by Prettier; linting by ESLint + @typescript-eslint.

See [CODESTYLE.md](./CODESTYLE.md) and [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## Contributing

Pull requests are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

## License

MIT
