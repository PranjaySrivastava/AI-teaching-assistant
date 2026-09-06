# Contributing Guidelines

Welcome to the AI Teaching Assistant team! To ensure seamless collaboration and clean code quality across our multi-disciplinary team, please follow these guidelines.

## Branching Strategy

- `main`: Production and stable demo branch.
- `develop`: Main integration branch.
- Feature branches: `feat/<feature-name>`, `fix/<bug-name>`, `docs/<topic>`.

## Pull Request Checklist

Before opening a PR, make sure you run:

```bash
npm run lint          # Run ESLint across packages
npm run type-check     # Verify TypeScript types
npm test              # Run unit tests
npm run format:check   # Verify Prettier formatting
```

All Pull Requests trigger automated GitHub Actions checks:

1. **Frontend Lint & Format**: ESLint + Prettier.
2. **TypeScript Type Check**: Zero TypeScript errors allowed.
3. **Backend Tests**: Node.js Jest tests & Python Pytest suite.
4. **Build Check**: Next.js production build must compile cleanly.

## Commit Conventions

Please write clear commit messages:

- `feat: add AssemblyAI streaming audio capture`
- `fix: resolve lip-sync delay on avatar animation`
- `docs: update setup instructions for Node.js`
