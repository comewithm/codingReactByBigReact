import alias from "@rollup/plugin-alias";
import { getBaseRollupPlugins, getPackageJSON, resolvePkgPath } from "./utils";
import generatePackageJson from "rollup-plugin-generate-package-json";

const { name, module, peerDependencies } = getPackageJSON('react-noop-render');
// react-dom包的路径
const pkgPath = resolvePkgPath(name);
// react-dom产物路径
const pkgDistPath = resolvePkgPath(name, true);

export default [
    // react-noop-render
    {
        input: `${pkgPath}/${module}`,
		output: [
			{
				file: `${pkgDistPath}/index.js`,
				name: 'ReactNoopRender',
				format: 'umd'
			}
		],
        external: [...Object.keys(peerDependencies), 'scheduler'],
        plugins: [
            ...getBaseRollupPlugins({
                typescript: {
                    exclude: ['./packages/react-dom/**/*'],
                    tsconfigOverride: {
                        compilerOptions: {
                            paths: {
                                hostConfig: [`./${name}/src/hostConfig.ts`]
                            }
                        }
                    }
                }
            }),
            // webpack resolve alias
            alias({
                entries: {
                    hostConfig: `${pkgPath}/src/hostConfig.ts`
                }
            }),
            generatePackageJson({
                inputFolder: pkgPath,
                outputFolder: pkgDistPath,
                baseContents: ({name, description, version}) => ({
                    name,
                    description,
                    version,
                    peerDependencies:{
                        react: version
                    },
                    main: 'index.js'
                })
            })
        ]
    }
]