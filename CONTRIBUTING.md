# Contributing to Personal Tracker Frontend

Thank you for your interest in contributing! Follow the steps below to get set up and keep the codebase clean.

## 1. Fork and Clone

```bash
git clone https://github.com/<your-username>/personal-tracker-frontend.git
cd personal-tracker-frontend
npm install
```

## 2. Install Pre-commit Hooks

Husky is configured to run ESLint before every commit.

```bash
npm run prepare   # sets up .husky/pre-commit automatically
```

## 3. Development Workflow

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes.
3. Run tests: `npm test`
4. Lint and format: `npm run lint && npm run format`
5. Commit: `git commit -m "feat: add my feature"`
6. Push and open a Pull Request.

## 4. Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|--------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `docs` | Documentation-only changes |
| `style` | Formatting, missing semi-colons, etc. |
| `test` | Adding or updating tests |
| `chore` | Build process or tooling changes |

## 5. Code Style Checklist

- [ ] All exported functions, hooks, and components have JSDoc/TSDoc comments.
- [ ] No component exceeds 200 lines — extract sub-components if needed.
- [ ] New hooks live in `src/hooks/`; utilities in `src/utils/`.
- [ ] `npm run lint` passes with zero errors.
- [ ] `npm test` passes with all tests green.
- [ ] `npm run build` succeeds.

See [CODESTYLE.md](./CODESTYLE.md) for naming conventions and file organization.

## 6. Reporting Issues

Please include:
- Steps to reproduce.
- Expected vs. actual behaviour.
- Browser and OS version.
- Console errors (if any).
