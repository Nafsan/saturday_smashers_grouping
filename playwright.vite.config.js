import { mergeConfig } from 'vite';
import config from './vite.config.js';
export default mergeConfig(config, { cacheDir: 'node_modules/.vite-playwright' });
