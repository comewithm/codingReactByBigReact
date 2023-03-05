import path from 'path'
import typescript from 'rollup-plugin-typescript2'
import resolve from '@rollup/plugin-babel'
import replace from '@rollup/plugin-replace'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import cjs from "@rollup/plugin-commonjs"

const tsConfig = {
    tsConfig: 'tsConfig.json'
}

const basePlugins = [
    typescript(tsConfig),
    resolve(),
    cjs(),
    replace({
        __LOG__: false,
        preventAssignment: true
    })
]

const pkgPath = path.resolve(__dirname, '../../packages')
const distPath = path.resolve(__dirname, '../../dist/node_modules')

function resolvePkgPath(pkgName, isDist) {
    if(isDist) {
        return `${distPath}/${pkgName}`
    }
    return `${pkgPath}/${pkgName}`
}


export default [
    // react-dom
    {
        input: `${resolvePkgPath('react-dom', false)}/index.ts`,
        output: [
            {
                file: `${resolvePkgPath('react-dom', true)}/client.js`,
                name: 'client.js',
                format: 'umd'
            },
            {
                file: `${resolvePkgPath('react-dom', true)}/index.js`,
                name: 'index.js',
                format: 'umd'
            }
        ],
        plugins: [
            ...basePlugins,
            generatePackageJson({
                inputFolder: resolvePkgPath('react-dom', false),
                outputFolder: resolvePkgPath('react-dom ', true),
                baseContents: ({name, description, version}) => ({
                    name,
                    description,
                    version,
                    main: 'index.js'
                })
            })
        ]
    },
    // react
    {
        input: `${resolvePkgPath('react', false)}/index.ts`,
        output: {
            file: `${resolvePkgPath('react', true)}/index.js`,
            name: 'index.js',
            format: 'umd'
        },
        plugins: [
            ...basePlugins,
            generatePackageJson({
                inputFolder: resolvePkgPath('react', false),
                outputFolder: resolvePkgPath('react', true),
                baseContents: ({name, description, version}) => ({
                    name,
                    description,
                    version,
                    main: 'index.js'
                })
            })
        ]
    },
    // jsx-runtime
    {
        input: `${resolvePkgPath('react', false)}/src/jsx.ts`,
        output: [
            {
                file: `${resolvePkgPath('react', true)}/jsx-dev-runtime.js`,
                name: 'jsx-dev-runtime.js',
                format: 'umd'
            },
            {
                file: `${resolvePkgPath('react', true)}/jsx-runtime.js`,
                name: 'jsx-runtime.js',
                format: 'umd'
            },
        ],
        plugins: basePlugins
    },
    // react-test-utils
    {
        input: `${resolvePkgPath('react-dom', false)}/test-utils.ts`,
        external: ['react', 'react-dom'],
        output: [
            {
                file: `${resolvePkgPath('react-dom', true)}/test-utils.js`,
                name: 'test-utils.js',
                format: 'umd'
            }
        ],
        plugins: basePlugins
    }
]