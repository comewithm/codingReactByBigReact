import reactDomConfig from './react-dom.config';
import reactConfig from './react.config';
import reactNoopRenderConfig from './react-noop-render.config'

export default () => {
	return [...reactConfig, ...reactDomConfig, ...reactNoopRenderConfig];
};