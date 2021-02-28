// @ts-check
const config = {
	env: {
		node: true,
	},
	plugins: ['security'],
	extends: ['plugin:security/recommended'],
	rules: {
		'default-case': ['warn', { commentPattern: '^no default$' }],
		eqeqeq: ['warn', 'smart'],
		'no-array-constructor': 'warn',
		'no-caller': 'warn',
		'no-cond-assign': ['warn', 'except-parens'],
		'no-const-assign': 'warn',
		'no-control-regex': 'warn',
		'no-dupe-args': 'warn',
		'no-dupe-class-members': 'warn',
		'no-dupe-keys': 'warn',
		'no-duplicate-case': 'warn',
		'no-empty-character-class': 'warn',
		'no-empty-pattern': 'warn',
		'no-eval': 'warn',
		'no-ex-assign': 'warn',
		'no-extend-native': 'warn',
		'no-extra-bind': 'warn',
		'no-extra-label': 'warn',
		'no-fallthrough': 'warn',
		'no-func-assign': 'warn',
		'no-implied-eval': 'warn',
		'no-invalid-regexp': 'warn',
		'no-iterator': 'warn',
		'no-label-var': 'warn',
		'no-labels': ['warn', { allowLoop: true, allowSwitch: false }],
		'no-loop-func': 'warn',
		'no-mixed-operators': [
			'warn',
			{
				groups: [
					['&', '|', '^', '~', '<<', '>>', '>>>'],
					['==', '!=', '===', '!==', '>', '>=', '<', '<='],
					['&&', '||'],
					['in', 'instanceof'],
				],
				allowSamePrecedence: false,
			},
		],
		'no-global-assign': 'warn',
		'no-unsafe-negation': 'warn',
		'no-new-func': 'warn',
		'no-new-symbol': 'warn',
		'no-new-wrappers': 'warn',
		'no-obj-calls': 'warn',
		'no-octal': 'warn',
		'no-octal-escape': 'warn',
		'no-redeclare': 'warn',
		'no-restricted-syntax': ['warn', 'WithStatement'],
		'no-script-url': 'warn',
		'no-sequences': 'warn',
		'no-shadow-restricted-names': 'warn',
		'no-sparse-arrays': 'warn',
		'no-template-curly-in-string': 'warn',
		'no-this-before-super': 'warn',
		'no-unexpected-multiline': 'warn',
		'no-unreachable': 'warn',
		'no-unused-expressions': [
			'error',
			{
				allowShortCircuit: true,
				allowTernary: true,
			},
		],
		'no-useless-escape': 'warn',
		'no-useless-rename': [
			'warn',
			{
				ignoreDestructuring: false,
				ignoreImport: false,
				ignoreExport: false,
			},
		],
		'no-with': 'warn',
		'no-whitespace-before-property': 'warn',
		'require-yield': 'warn',
		'rest-spread-spacing': ['warn', 'never'],
		'unicode-bom': ['warn', 'never'],
		'use-isnan': 'warn',
		'valid-typeof': 'warn',
	},
};

module.exports = config;
