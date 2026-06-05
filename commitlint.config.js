/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'revert'],
    ],
    'scope-enum': [
      1,
      'always',
      [
        'shared',
        'api',
        'web-app',
        'passenger-app',
        'driver-app',
        'admin-panel',
        'dispatcher-panel',
        'matching',
        'tracking',
        'billing',
        'infra',
        'docs',
        'ci',
        'deps',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
};
