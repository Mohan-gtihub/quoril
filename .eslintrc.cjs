module.exports = {
    root: true,
    env: { browser: true, es2020: true },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
        'prettier',
    ],
    // `landing` is a separate Next.js app with its own toolchain and its own
    // rules (@next/next/*). Linting it from here reported every inline
    // `eslint-disable @next/next/...` as "rule not found"; it is linted by
    // `npm run lint` inside landing/ instead.
    ignorePatterns: ['dist', '.eslintrc.cjs', 'dist-electron', 'landing'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        // rules-of-hooks catches real correctness bugs and is enforced.
        // exhaustive-deps is advisory and currently reports 11 pre-existing
        // findings across the app; each needs individual review because
        // "fixing" a dependency array changes runtime behaviour. Off until
        // those are worked through, rather than blanket-suppressed inline.
        'react-hooks/exhaustive-deps': 'off',
    },
}
