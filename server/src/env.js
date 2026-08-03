import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Load the repo-root .env first (dev), then any cwd .env; real env vars win.
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });
dotenv.config();
