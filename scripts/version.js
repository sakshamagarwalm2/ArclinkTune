const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join(__dirname, '..', 'VERSION.json');
const PUBLIC_VERSION = path.join(__dirname, '..', 'app', 'public', 'version.json');

function getGitCommit() {
  try {
    const gitHash = require('child_process')
      .execSync('git rev-parse --short HEAD 2>/dev/null', { encoding: 'utf8' })
      .trim();
    return gitHash;
  } catch {
    return '';
  }
}

function readVersion() {
  try {
    const data = fs.readFileSync(VERSION_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { version: '1.0.0', buildDate: '', gitCommit: '' };
  }
}

function writeVersion(data) {
  fs.writeFileSync(VERSION_FILE, JSON.stringify(data, null, 2) + '\n');
  fs.writeFileSync(PUBLIC_VERSION, JSON.stringify(data, null, 2) + '\n');
  console.log(`✅ Copied version.json to app/public/`);
}

function bumpVersion(currentVersion, type) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function main() {
  const type = process.argv[2] || 'patch';
  const validTypes = ['major', 'minor', 'patch'];
  
  if (!validTypes.includes(type)) {
    console.error(`❌ Invalid type: ${type}. Use: major, minor, or patch`);
    process.exit(1);
  }

  const versionData = readVersion();
  const newVersion = bumpVersion(versionData.version, type);
  
  versionData.version = newVersion;
  versionData.buildDate = new Date().toISOString().split('T')[0];
  versionData.gitCommit = getGitCommit();
  
  writeVersion(versionData);

  console.log(`\n✅ Version updated: ${versionData.version}`);
  console.log(`   Build Date: ${versionData.buildDate}`);
  console.log(`   Git Commit: ${versionData.gitCommit || 'N/A'}\n`);
}

main();