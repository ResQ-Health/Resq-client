// Vercel Serverless Function Handler (ES Module compatible with root "type": "module")
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const app = require('../server/src/index.js');

export default app;
