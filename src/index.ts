import path from 'node:path';
import { SettingsStore } from './config/settings';
import { createApp } from './server/app';
import { Store } from './store/db';

const dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data');
const port = Number(process.env.PORT ?? 3001);

const app = createApp({
  store: new Store(dataDir),
  settingsStore: new SettingsStore(dataDir),
  webDist: path.resolve(process.cwd(), 'web', 'dist'),
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Weekly Status Report Generator running at http://localhost:${port}`);
});
