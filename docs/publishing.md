# Publishing agy-translate to npm

Single package: **`agy-translate`** (unscoped, under your npm user account).

Runtime dependency `@cursor-translate/core@^0.2.15` is already on npm — publish only this repo.

---

## 1. Initial / First-Time Setup

For a brand new unscoped package on npm:

### Option A (Recommended): Manual First Publish
If you have 2FA enabled on npm, the very first release of a new package name is easiest to publish manually once so npm creates the package under your account:

```bash
cd /Users/davlet42/Projects/agy-translate
npm login
npm whoami
npm run build && npm test
npm publish --access public
```

### Option B: Automated via GitHub Actions
1. Go to [npmjs.com/settings/~/tokens](https://www.npmjs.com/settings/~/tokens)
2. Generate an **Automation (Classic)** token (or a granular access token with Read and Write permissions on all packages / create new packages, with **Bypass 2FA** enabled).
3. Copy the token.
4. Go to your GitHub repository: **Settings → Secrets and variables → Actions**.
5. Add a new repository secret named **`NPM_TOKEN`** with the token value.

---

## 2. Release Flow (GitHub Actions)

| Trigger | Workflow |
|---|---|
| push/PR `main` | `.github/workflows/ci.yml` — `npm ci` + `npm test` |
| tag `v*` | `.github/workflows/publish.yml` — test + `npm publish` |
| manual | GitHub Actions → **Publish npm** → **Run workflow** |

### Step-by-step Release:

```bash
# 1. Update version if needed
npm version patch # or minor, e.g. 0.1.1
# 2. Push commit and tag to GitHub
git push origin main
git push origin --tags
```

GitHub Actions will automatically run tests and publish to npm!
