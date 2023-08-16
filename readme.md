husky install
npx husky add .husky/pre-commit "pnpm lint"
npx husky add .husky/commit-msg 'npx --no-install commitlint --edit "$1"'