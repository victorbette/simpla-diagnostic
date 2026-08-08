import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

const buildTime = new Date().toISOString();

let version = '1.0.0';
try {
  version = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  version = buildTime.replace(/[^0-9]/g, '').slice(0, 12);
}

const content = JSON.stringify({ version, buildTime }, null, 2);
writeFileSync('public/version.json', content);
console.log(`Version updated: ${version} (${buildTime})`);
