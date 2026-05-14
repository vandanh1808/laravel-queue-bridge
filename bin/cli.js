#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const command = process.argv[2];

if (command === 'install') {
  installSkill();
} else {
  console.log('laravel-queue-bridge CLI\n');
  console.log('Commands:');
  console.log('  install           Install AI assistant docs for all supported tools');
  console.log('  install claude    Install for Claude Code only');
  console.log('  install copilot   Install for GitHub Copilot only');
  console.log('  install cursor    Install for Cursor only');
  console.log('  install codex     Install for OpenAI Codex only');
  console.log('  install windsurf  Install for Windsurf only');
  console.log('\nUsage:');
  console.log('  npx laravel-queue-bridge install');
}

function installSkill() {
  const target = process.argv[3] || 'all';
  const projectRoot = process.cwd();
  const packageRoot = path.resolve(__dirname, '..');
  const skillSrc = path.join(packageRoot, '.claude', 'skills', 'laravel-queue-bridge.md');
  const contextSrc = path.join(packageRoot, 'CLAUDE.md');

  if (!fs.existsSync(skillSrc)) {
    console.error('Error: skill source file not found.');
    process.exit(1);
  }

  const skillContent = fs.readFileSync(skillSrc, 'utf8');
  const contextContent = fs.existsSync(contextSrc) ? fs.readFileSync(contextSrc, 'utf8') : '';

  const installers = {
    claude: () => installClaude(projectRoot, skillSrc, contextSrc),
    copilot: () => installCopilot(projectRoot, skillContent, contextContent),
    cursor: () => installCursor(projectRoot, skillContent, contextContent),
    codex: () => installCodex(projectRoot, skillContent, contextContent),
    windsurf: () => installWindsurf(projectRoot, skillContent, contextContent),
  };

  const targets = target === 'all' ? Object.keys(installers) : [target];

  if (!installers[targets[0]]) {
    console.error(`Unknown target: ${target}`);
    console.error('Available: claude, copilot, cursor, codex, windsurf, all');
    process.exit(1);
  }

  console.log('Installing laravel-queue-bridge AI docs...\n');

  for (const t of targets) {
    installers[t]();
  }

  console.log('\nDone!');
}

// ── Installers ──

function installClaude(projectRoot, skillSrc, contextSrc) {
  console.log('  Claude Code:');
  writeFile(
    path.join(projectRoot, '.claude', 'skills', 'laravel-queue-bridge.md'),
    fs.readFileSync(skillSrc, 'utf8'),
    '    ',
  );
  if (fs.existsSync(contextSrc)) {
    writeFile(
      path.join(projectRoot, '.claude', 'docs', 'laravel-queue-bridge.md'),
      fs.readFileSync(contextSrc, 'utf8'),
      '    ',
    );
  }
}

function installCopilot(projectRoot, skillContent, contextContent) {
  console.log('  GitHub Copilot:');
  const content = buildDoc(skillContent, contextContent);
  appendToFile(
    path.join(projectRoot, '.github', 'copilot-instructions.md'),
    content,
    'laravel-queue-bridge',
    '    ',
  );
}

function installCursor(projectRoot, skillContent, contextContent) {
  console.log('  Cursor:');
  const content = buildDoc(skillContent, contextContent);
  writeFile(
    path.join(projectRoot, '.cursor', 'rules', 'laravel-queue-bridge.md'),
    content,
    '    ',
  );
}

function installCodex(projectRoot, skillContent, contextContent) {
  console.log('  Codex:');
  const content = buildDoc(skillContent, contextContent);
  appendToFile(
    path.join(projectRoot, 'AGENTS.md'),
    content,
    'laravel-queue-bridge',
    '    ',
  );
}

function installWindsurf(projectRoot, skillContent, contextContent) {
  console.log('  Windsurf:');
  const content = buildDoc(skillContent, contextContent);
  appendToFile(
    path.join(projectRoot, '.windsurfrules'),
    content,
    'laravel-queue-bridge',
    '    ',
  );
}

// ── Helpers ──

function buildDoc(skillContent, contextContent) {
  const skill = stripFrontmatter(skillContent);
  let doc = `\n# laravel-queue-bridge\n\n`;
  if (contextContent) {
    doc += stripTitle(contextContent) + '\n\n';
  }
  doc += skill;
  return doc;
}

function stripFrontmatter(content) {
  return content.replace(/^---[\s\S]*?---\s*\n/, '');
}

function stripTitle(content) {
  return content.replace(/^#\s+.*\n\n?/, '');
}

function writeFile(filePath, content, indent) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const action = fs.existsSync(filePath) ? 'UPDATE' : 'CREATE';
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`${indent}${action}  ${path.relative(process.cwd(), filePath)}`);
}

function appendToFile(filePath, content, marker, indent) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const startTag = `<!-- laravel-queue-bridge:start -->`;
  const endTag = `<!-- laravel-queue-bridge:end -->`;
  const block = `${startTag}\n${content}\n${endTag}`;

  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8');
    if (existing.includes(startTag)) {
      const updated = existing.replace(
        new RegExp(`${escapeRegex(startTag)}[\\s\\S]*?${escapeRegex(endTag)}`),
        block,
      );
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log(`${indent}UPDATE  ${path.relative(process.cwd(), filePath)}`);
    } else {
      fs.appendFileSync(filePath, '\n' + block + '\n', 'utf8');
      console.log(`${indent}APPEND  ${path.relative(process.cwd(), filePath)}`);
    }
  } else {
    fs.writeFileSync(filePath, block + '\n', 'utf8');
    console.log(`${indent}CREATE  ${path.relative(process.cwd(), filePath)}`);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
