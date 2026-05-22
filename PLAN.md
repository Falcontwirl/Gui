# Consolidate CLI into Single TUI Entry Point

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all `gui <subcommand>` commands and make `gui` the only entry point — everything is accessible via shortcuts and the command palette inside the interactive TUI.

**Architecture:** The entry point (`cx.ts`) strips down to two paths: `gui` (launch TUI) and `gui "question"` (launch TUI with auto-chat). All actions formerly behind subcommands (`login`, `logout`, `chat`, `projects`, `open`, `share`, `status`, `history`, `rerun`) become TUI hotkeys and command palette entries. A new `ProjectsView` lets users switch between cached projects. The Footer shows context-aware shortcut hints per view.

**Tech Stack:** TypeScript, React, Ink (terminal UI), existing auth/projects libs

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cx/bin/cx.ts` | Modify | Strip subcommand dispatch, always launch TUI |
| `cx/ui/App.tsx` | Modify | Add new hotkeys (`s`, `p`, `r`), new views (`projects`), toast state, pass new props |
| `cx/ui/Footer.tsx` | Modify | Context-aware shortcut bar per view |
| `cx/ui/CommandPalette.tsx` | Modify | Add all commands (open, share, projects, rerun, logout) |
| `cx/ui/Dashboard.tsx` | Modify | Accept and render toast messages, show status |
| `cx/ui/ProjectsView.tsx` | Create | Project list with keyboard selection and switching |
| `cx/ui/ConversationList.tsx` | Modify | Remove inline hint bar (Footer handles it now) |

---

### Task 1: Strip subcommands from entry point

**Files:**
- Modify: `cx/bin/cx.ts`

- [ ] **Step 1: Replace the entire file with the simplified entry point**

The new `cx.ts` only handles three paths:
1. `gui login` — headless auth (kept for CI/scripting, launches TUI after success)  
2. `gui "question"` — launch TUI with initial query passed as prop
3. `gui` — launch TUI

All flag parsing stays. All subcommand branches (`logout`, `chat`, `projects`, `open`, `share`, `status`, `history`, `rerun`) are deleted — they move into the TUI.

```typescript
import { resolve, basename } from 'path';
import { readLocalRepo } from '../lib/fileReader.js';
import { existsSync } from 'fs';
import { config } from 'dotenv';
import { exec } from 'child_process';
import { login, getToken, getApiBase, getWebBase } from '../lib/auth.js';
import { getProjectForRepo } from '../lib/projects.js';
import React from 'react';
import { render } from 'ink';
import { App } from '../ui/App.js';

for (const dir of [process.cwd(), resolve(process.cwd(), '..')]) {
  const envPath = resolve(dir, '.env');
  if (existsSync(envPath)) { config({ path: envPath, quiet: true }); break; }
}

const args = process.argv.slice(2);
const flags: Record<string, string> = {};
const positional: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) {
    flags.dir = args[++i];
  } else if (args[i] === '--max-files' && args[i + 1]) {
    flags.maxFiles = args[++i];
  } else if (args[i] === '--new') {
    flags.new = 'true';
  } else if (args[i] === '--open') {
    flags.open = 'true';
  } else if (args[i] === '--help' || args[i] === '-h') {
    printHelp();
    process.exit(0);
  } else if (!args[i].startsWith('--')) {
    positional.push(args[i]);
  }
}

const subcommand = positional[0];
const repoDir = resolve(flags.dir || '.');
const repoName = basename(repoDir);

if (subcommand === 'login') {
  // Headless login for CI/scripting — still works without TUI
  login()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n  Login failed:', err.message);
      process.exit(1);
    });
} else {
  // Everything else goes through the TUI
  const query = positional.join(' ');
  const token = await getToken();
  const cached = flags.new !== 'true' ? getProjectForRepo(repoDir) : null;

  render(
    React.createElement(App, {
      projectId: cached?.projectId || null,
      repoName,
      token: token || '',
      needsAnalysis: !cached,
      repoDir,
      initialQuery: query || undefined,
    })
  );
}

function printHelp() {
  console.log(`
  gui — codebase explorer

  Usage:
    gui                              Launch interactive explorer
    gui "how does auth work?"        Launch and ask a question
    gui login                        Log in via browser (for CI/scripting)

  Options:
    --dir <path>       Repository directory (default: current directory)
    --max-files <n>    Max files to analyze (default: 30)
    --new              Force new analysis
    --open             Open the URL in your browser after analysis
    -h, --help         Show this help message

  Inside the TUI:
    c / n     New chat            o     Open in browser
    s         Share link          p     Switch project
    r         Re-analyze          h     Chat history
    /         Command palette     q     Quit
  `);
}
```

- [ ] **Step 2: Build and verify it compiles**

Run: `cd cx && npx esbuild bin/cx.ts --bundle --platform=node --format=esm --outfile=dist/cli.mjs --external:ink --external:react --external:ink-text-input --external:ink-spinner --external:@anthropic-ai/sdk`

Expected: Build succeeds with no errors (warnings about external deps are fine).

- [ ] **Step 3: Commit**

```bash
git add cx/bin/cx.ts
git commit -m "refactor: strip subcommands from CLI entry point, always launch TUI"
```

---

### Task 2: Add new props and hotkeys to App.tsx

**Files:**
- Modify: `cx/ui/App.tsx`

- [ ] **Step 1: Update the App component with new view type, props, hotkeys, and toast**

Add `'projects'` to the View type. Add `initialQuery` prop. Add hotkeys for `s` (share), `p` (projects), `r` (rerun). Add toast state for inline messages. Wire up logout in command handler. Pass `initialQuery` to auto-start chat.

```typescript
import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Dashboard } from './Dashboard.js';
import { ChatView } from './ChatView.js';
import { HistoryView } from './HistoryView.js';
import { ProjectsView } from './ProjectsView.js';
import { CommandPalette } from './CommandPalette.js';
import { WelcomeView } from './WelcomeView.js';
import { AnalyzeView } from './AnalyzeView.js';
import { Footer } from './Footer.js';
import { getToken, getWebBase, clearCredentials } from '../lib/auth.js';
import { exec } from 'child_process';

export type View = 'dashboard' | 'chat' | 'history' | 'projects' | 'welcome' | 'analyze';

interface AppProps {
  projectId: string | null;
  repoName: string;
  token: string;
  needsAnalysis: boolean;
  repoDir: string;
  initialQuery?: string;
}

function openBrowser(url: string) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd);
}

export function App({ projectId, repoName, token, needsAnalysis, repoDir, initialQuery }: AppProps) {
  const { exit } = useApp();
  const [view, setView] = useState<View>(
    !token ? 'welcome' : !projectId && needsAnalysis ? 'analyze' : projectId ? 'dashboard' : 'welcome'
  );
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(projectId);
  const [currentRepoName, setCurrentRepoName] = useState(repoName);
  const [currentToken, setCurrentToken] = useState(token);
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-start chat if initialQuery was provided
  useEffect(() => {
    if (initialQuery && currentProjectId && view === 'dashboard') {
      setResumeSessionId(null);
      setView('chat');
    }
  }, [currentProjectId]);

  useInput((input, key) => {
    if (showCommandPalette) return;
    if (view === 'chat') return;
    if (view === 'welcome') return;
    if (view === 'projects') return;

    if (input === 'q') {
      exit();
      return;
    }
    if (input === '/') {
      setShowCommandPalette(true);
      return;
    }
    if ((input === 'c' || input === 'n') && currentProjectId) {
      setResumeSessionId(null);
      setView('chat');
      return;
    }
    if (input === 'o' && currentProjectId) {
      const url = `${getWebBase()}/explore/${currentProjectId}`;
      openBrowser(url);
      showToast(`Opened in browser`);
      return;
    }
    if (input === 's' && currentProjectId) {
      const url = `${getWebBase()}/explore/${currentProjectId}`;
      showToast(`Share: ${url}`);
      return;
    }
    if (input === 'h' && currentProjectId) {
      setView('history');
      return;
    }
    if (input === 'p') {
      setView('projects');
      return;
    }
    if (input === 'r' && currentProjectId) {
      setView('analyze');
      return;
    }
    if (key.escape && view !== 'dashboard') {
      setView('dashboard');
      return;
    }
  });

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  const handleLoggedIn = async () => {
    const newToken = await getToken();
    if (newToken) {
      setCurrentToken(newToken);
      setView(needsAnalysis ? 'analyze' : 'dashboard');
    }
  };

  const handleCommand = (cmd: string) => {
    setShowCommandPalette(false);
    switch (cmd) {
      case 'chat': setResumeSessionId(null); setView('chat'); break;
      case 'history': setView('history'); break;
      case 'analyze': setView('analyze'); break;
      case 'projects': setView('projects'); break;
      case 'open':
        if (currentProjectId) {
          openBrowser(`${getWebBase()}/explore/${currentProjectId}`);
          showToast('Opened in browser');
        }
        break;
      case 'share':
        if (currentProjectId) {
          showToast(`Share: ${getWebBase()}/explore/${currentProjectId}`);
        }
        break;
      case 'logout':
        clearCredentials();
        setCurrentToken('');
        setCurrentProjectId(null);
        setView('welcome');
        break;
      case 'quit': exit(); break;
      default: break;
    }
  };

  const handleAnalyzeComplete = (newProjectId: string) => {
    setCurrentProjectId(newProjectId);
    setView('dashboard');
  };

  const handleResumeSession = (sessionId: string) => {
    setResumeSessionId(sessionId);
    setView('chat');
  };

  const handleSwitchProject = (newProjectId: string, newRepoName: string) => {
    setCurrentProjectId(newProjectId);
    setCurrentRepoName(newRepoName);
    setView('dashboard');
  };

  const footerHints = getFooterHints(view);

  return (
    <Box flexDirection="column">
      {showCommandPalette && (
        <CommandPalette
          onSelect={handleCommand}
          onClose={() => setShowCommandPalette(false)}
        />
      )}

      {!showCommandPalette && view === 'welcome' && (
        <WelcomeView onLoggedIn={handleLoggedIn} />
      )}

      {!showCommandPalette && view === 'analyze' && (
        <AnalyzeView
          repoDir={repoDir}
          repoName={currentRepoName}
          token={currentToken}
          onComplete={handleAnalyzeComplete}
        />
      )}

      {!showCommandPalette && view === 'dashboard' && currentProjectId && (
        <Dashboard
          projectId={currentProjectId}
          repoName={currentRepoName}
          token={currentToken}
          onStartChat={() => { setResumeSessionId(null); setView('chat'); }}
          onResumeSession={handleResumeSession}
          toast={toast}
        />
      )}

      {!showCommandPalette && view === 'chat' && currentProjectId && (
        <ChatView
          projectId={currentProjectId}
          repoName={currentRepoName}
          token={currentToken}
          sessionId={resumeSessionId}
          onBack={() => setView('dashboard')}
          repoDir={repoDir}
          initialQuery={!resumeSessionId ? initialQuery : undefined}
        />
      )}

      {!showCommandPalette && view === 'history' && currentProjectId && (
        <HistoryView
          projectId={currentProjectId}
          repoName={currentRepoName}
          token={currentToken}
          onBack={() => setView('dashboard')}
          onResumeSession={handleResumeSession}
        />
      )}

      {!showCommandPalette && view === 'projects' && (
        <ProjectsView
          currentProjectId={currentProjectId}
          token={currentToken}
          onBack={() => setView('dashboard')}
          onSwitch={handleSwitchProject}
        />
      )}

      {!showCommandPalette && view !== 'welcome' && view !== 'analyze' && (
        <Footer hints={footerHints} />
      )}
    </Box>
  );
}

function getFooterHints(view: View): Array<{ key: string; label: string }> {
  switch (view) {
    case 'dashboard':
      return [
        { key: 'c', label: 'chat' },
        { key: 'o', label: 'open' },
        { key: 's', label: 'share' },
        { key: 'p', label: 'projects' },
        { key: 'r', label: 'rerun' },
        { key: 'h', label: 'history' },
        { key: '/', label: 'commands' },
        { key: 'q', label: 'quit' },
      ];
    case 'chat':
      return [
        { key: 'Esc', label: 'back' },
      ];
    case 'history':
      return [
        { key: 'Enter', label: 'resume' },
        { key: 'Esc', label: 'back' },
      ];
    case 'projects':
      return [
        { key: 'Enter', label: 'switch' },
        { key: 'Esc', label: 'back' },
      ];
    default:
      return [];
  }
}
```

- [ ] **Step 2: Build and verify**

Run: `cd cx && npx esbuild bin/cx.ts --bundle --platform=node --format=esm --outfile=dist/cli.mjs --external:ink --external:react --external:ink-text-input --external:ink-spinner --external:@anthropic-ai/sdk`

Expected: Build succeeds. May show a warning about `ProjectsView` not existing yet — that's fine, we create it next.

- [ ] **Step 3: Commit**

```bash
git add cx/ui/App.tsx
git commit -m "feat: add share/projects/rerun hotkeys, toast, initialQuery to TUI"
```

---

### Task 3: Create ProjectsView

**Files:**
- Create: `cx/ui/ProjectsView.tsx`

- [ ] **Step 1: Write the ProjectsView component**

Shows cached projects in a selectable list. Arrow keys to navigate, Enter to switch, Esc to go back. Highlights the currently active project.

```typescript
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors, symbols } from './theme.js';
import { listProjects } from '../lib/projects.js';

interface ProjectsViewProps {
  currentProjectId: string | null;
  token: string;
  onBack: () => void;
  onSwitch: (projectId: string, repoName: string) => void;
}

export function ProjectsView({ currentProjectId, onBack, onSwitch }: ProjectsViewProps) {
  const projects = listProjects().reverse();
  const [cursor, setCursor] = useState(0);

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.upArrow) {
      setCursor(c => Math.max(0, c - 1));
    } else if (key.downArrow) {
      setCursor(c => Math.min(projects.length - 1, c + 1));
    } else if (key.return && projects[cursor]) {
      onSwitch(projects[cursor].projectId, projects[cursor].repoName);
    }
  });

  if (projects.length === 0) {
    return (
      <Box flexDirection="column" paddingLeft={1}>
        <Box marginBottom={1}>
          <Text bold color={colors.accent}>Projects</Text>
        </Box>
        <Text color={colors.textSecondary}>No projects yet. Run gui in a repo to analyze it.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingLeft={1}>
      <Box marginBottom={1}>
        <Text bold color={colors.accent}>Projects</Text>
        <Box flexGrow={1} />
        <Text color={colors.textTertiary}>{projects.length} total</Text>
      </Box>

      <Box flexDirection="column">
        {projects.slice(0, 15).map((project, i) => {
          const isSelected = i === cursor;
          const isCurrent = project.projectId === currentProjectId;
          const date = new Date(project.createdAt).toLocaleDateString();

          return (
            <Box key={project.projectId}>
              <Text color={isSelected ? colors.accent : colors.textTertiary}>
                {isSelected ? symbols.cursor : ' '}{' '}
              </Text>
              <Text color={isSelected ? colors.textPrimary : colors.textSecondary} bold={isSelected}>
                {project.repoName.slice(0, 30).padEnd(32)}
              </Text>
              <Text color={colors.textTertiary}>{date}</Text>
              {isCurrent && (
                <Text color={colors.green}> {symbols.dot} active</Text>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Build and verify**

Run: `cd cx && npx esbuild bin/cx.ts --bundle --platform=node --format=esm --outfile=dist/cli.mjs --external:ink --external:react --external:ink-text-input --external:ink-spinner --external:@anthropic-ai/sdk`

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add cx/ui/ProjectsView.tsx
git commit -m "feat: add ProjectsView for switching between analyzed repos"
```

---

### Task 4: Expand CommandPalette with all actions

**Files:**
- Modify: `cx/ui/CommandPalette.tsx`

- [ ] **Step 1: Add all commands to the palette**

Add entries for: open, share, projects, rerun, logout. Keep existing: chat, history, analyze, quit.

```typescript
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { colors, symbols } from './theme.js';

interface Command {
  id: string;
  label: string;
  key: string;
  description: string;
}

const commands: Command[] = [
  { id: 'chat', label: 'New Chat', key: 'c', description: 'Start a new conversation' },
  { id: 'history', label: 'History', key: 'h', description: 'Browse past conversations' },
  { id: 'open', label: 'Open', key: 'o', description: 'Open project in browser' },
  { id: 'share', label: 'Share', key: 's', description: 'Copy share link' },
  { id: 'projects', label: 'Projects', key: 'p', description: 'Switch to another project' },
  { id: 'analyze', label: 'Re-analyze', key: 'r', description: 'Re-run analysis on current project' },
  { id: 'logout', label: 'Logout', key: '', description: 'Clear credentials and sign out' },
  { id: 'quit', label: 'Quit', key: 'q', description: 'Exit gui' },
];

interface CommandPaletteProps {
  onSelect: (command: string) => void;
  onClose: () => void;
}

function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette({ onSelect, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const filtered = commands.filter(c =>
    fuzzyMatch(query, c.label) || fuzzyMatch(query, c.description)
  );

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.upArrow) {
      setCursor(c => Math.max(0, c - 1));
    } else if (key.downArrow) {
      setCursor(c => Math.min(filtered.length - 1, c + 1));
    } else if (key.return) {
      if (filtered[cursor]) {
        onSelect(filtered[cursor].id);
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.accent} paddingX={1}>
      <Box marginBottom={1}>
        <Text color={colors.accent} bold>Commands</Text>
        <Box flexGrow={1} />
        <Text color={colors.textTertiary}>[Esc] close</Text>
      </Box>

      <Box>
        <Text color={colors.accent}>{symbols.cursor} </Text>
        <TextInput
          value={query}
          onChange={(val) => { setQuery(val); setCursor(0); }}
          placeholder="Type to filter..."
        />
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {filtered.map((cmd, i) => {
          const isSelected = i === cursor;
          return (
            <Box key={cmd.id}>
              <Text color={isSelected ? colors.accent : colors.textTertiary}>
                {isSelected ? symbols.cursor : ' '}
              </Text>
              <Text color={isSelected ? colors.textPrimary : colors.textSecondary} bold={isSelected}>
                {' '}{cmd.label.padEnd(16)}
              </Text>
              {cmd.key && (
                <Text color={colors.textTertiary}>[{cmd.key}]  </Text>
              )}
              <Text color={colors.textTertiary}>{cmd.description}</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Build and verify**

Run: `cd cx && npx esbuild bin/cx.ts --bundle --platform=node --format=esm --outfile=dist/cli.mjs --external:ink --external:react --external:ink-text-input --external:ink-spinner --external:@anthropic-ai/sdk`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add cx/ui/CommandPalette.tsx
git commit -m "feat: expand command palette with all TUI actions"
```

---

### Task 5: Update Footer with styled shortcut hints

**Files:**
- Modify: `cx/ui/Footer.tsx`

- [ ] **Step 1: Restyle Footer to show key-label pairs with accent coloring**

The current Footer just joins hints as plain text. Update it to show each key in the accent color and the label in muted, matching the style of the existing ConversationList hint bar.

```typescript
import React from 'react';
import { Box, Text } from 'ink';
import { colors } from './theme.js';

interface FooterProps {
  hints: Array<{ key: string; label: string }>;
}

export function Footer({ hints }: FooterProps) {
  if (hints.length === 0) return null;

  return (
    <Box marginTop={1} paddingLeft={1}>
      {hints.map((h, i) => (
        <Box key={h.key} marginRight={2}>
          <Text color={colors.accent}>{h.key}</Text>
          <Text color={colors.textTertiary}> {h.label}</Text>
        </Box>
      ))}
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add cx/ui/Footer.tsx
git commit -m "feat: styled context-aware footer with accent-colored shortcut keys"
```

---

### Task 6: Update Dashboard to show toast and remove redundant hints

**Files:**
- Modify: `cx/ui/Dashboard.tsx`
- Modify: `cx/ui/ConversationList.tsx`

- [ ] **Step 1: Add toast prop to Dashboard**

The Dashboard should accept and render a toast message (shown for 3s after share/open actions). Also remove the inline hint bar from ConversationList since the Footer now handles that.

Update `Dashboard.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from './Header.js';
import { ConversationList } from './ConversationList.js';
import { colors } from './theme.js';
import { fetchProjectData, fetchSessionsData } from './hooks/useProject.js';

interface DashboardProps {
  projectId: string;
  repoName: string;
  token: string;
  onStartChat: () => void;
  onResumeSession: (sessionId: string) => void;
  toast?: string | null;
}

interface Session {
  sessionId: string;
  startedAt: string;
  messageCount: number;
  preview: string;
}

export function Dashboard({ projectId, repoName, token, onStartChat, onResumeSession, toast }: DashboardProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [conceptCount, setConceptCount] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<string>('loading');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [projectData, sessionsData] = await Promise.all([
          fetchProjectData(projectId, token),
          fetchSessionsData(projectId, token),
        ]);

        if (cancelled) return;

        if (projectData) {
          setConceptCount(projectData.conceptCount);
          setStatus(projectData.status);
        }
        setSessions(sessionsData);
      } catch {
        if (!cancelled) setStatus('error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [projectId, token]);

  useInput((input, key) => {
    if (key.return) {
      onStartChat();
    }
  });

  return (
    <Box flexDirection="column" paddingLeft={1}>
      <Header
        repoName={repoName}
        conceptCount={conceptCount}
        status={loading ? 'loading' : status}
      />

      {loading ? (
        <Box marginLeft={2}>
          <Text color={colors.textTertiary}>Loading...</Text>
        </Box>
      ) : (
        <ConversationList
          sessions={sessions}
          isActive={true}
          onSelect={onResumeSession}
          onNewChat={onStartChat}
        />
      )}

      {toast && (
        <Box marginTop={1} marginLeft={1}>
          <Text color={colors.green}>{toast}</Text>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Remove inline hint bar from ConversationList**

The ConversationList currently renders its own hint bar at the bottom. Remove it — the global Footer in App.tsx now handles this.

Update the bottom of `ConversationList.tsx` — remove the `<Box marginTop={1}>` block with the hint keys. The component should end right after the session list mapping.

Replace the existing return block in `ConversationList.tsx` (the non-empty-sessions branch) with:

```typescript
  return (
    <Box flexDirection="column">
      {sessions.slice(0, 8).map((session, i) => {
        const isSelected = isActive && i === cursor;
        const preview = (session.preview || 'Untitled').slice(0, 40);
        const time = formatRelativeTime(session.startedAt);
        const msgs = `${session.messageCount}msg`;

        return (
          <Box key={session.sessionId}>
            <Text color={isSelected ? colors.accent : colors.textTertiary}>
              {isSelected ? symbols.cursor : ' '}{' '}
            </Text>
            <Text color={isSelected ? colors.textPrimary : colors.textSecondary} bold={isSelected}>
              {preview}
            </Text>
            <Text color={colors.textTertiary}> {time} {msgs}</Text>
          </Box>
        );
      })}
    </Box>
  );
```

Also update the empty-sessions branch — remove the inline hints there too:

```typescript
  if (sessions.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color={colors.textTertiary}>No conversations yet.</Text>
      </Box>
    );
  }
```

- [ ] **Step 3: Build and verify**

Run: `cd cx && npx esbuild bin/cx.ts --bundle --platform=node --format=esm --outfile=dist/cli.mjs --external:ink --external:react --external:ink-text-input --external:ink-spinner --external:@anthropic-ai/sdk`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add cx/ui/Dashboard.tsx cx/ui/ConversationList.tsx
git commit -m "feat: add toast to dashboard, remove redundant inline hint bars"
```

---

### Task 7: Support initialQuery auto-send in ChatView

**Files:**
- Modify: `cx/ui/ChatView.tsx`

- [ ] **Step 1: Add initialQuery prop that auto-sends on mount**

When `initialQuery` is provided, the ChatView should automatically send it as the first message.

Add the prop to the interface:

```typescript
interface ChatViewProps {
  projectId: string;
  repoName: string;
  token: string;
  sessionId: string | null;
  onBack: () => void;
  repoDir?: string;
  initialQuery?: string;
}
```

Add a `useEffect` after the existing `localFiles` effect to auto-send:

```typescript
  const [initialSent, setInitialSent] = useState(false);

  useEffect(() => {
    if (initialQuery && filesLoaded && !initialSent) {
      setInitialSent(true);
      sendMessage(initialQuery);
    }
  }, [filesLoaded, initialQuery, initialSent]);
```

- [ ] **Step 2: Build and verify**

Run: `cd cx && npx esbuild bin/cx.ts --bundle --platform=node --format=esm --outfile=dist/cli.mjs --external:ink --external:react --external:ink-text-input --external:ink-spinner --external:@anthropic-ai/sdk`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add cx/ui/ChatView.tsx
git commit -m "feat: auto-send initialQuery when launching TUI with a question"
```

---

### Task 8: Final build and manual test

- [ ] **Step 1: Full build**

Run: `cd cx && npx esbuild bin/cx.ts --bundle --platform=node --format=esm --outfile=dist/cli.mjs --external:ink --external:react --external:ink-text-input --external:ink-spinner --external:@anthropic-ai/sdk`

Expected: Build succeeds with no errors.

- [ ] **Step 2: Test `gui --help`**

Run: `node cx/dist/cli.mjs --help`

Expected: Shows the new help text with TUI shortcuts listed instead of subcommands.

- [ ] **Step 3: Test `gui` launches TUI**

Run: `node cx/dist/cli.mjs`

Expected: TUI launches. If logged in and project cached, shows dashboard with Footer shortcut bar. Press `p` to see projects list, `s` to see share toast, `/` to open command palette (should show all 8 commands), `q` to quit.

- [ ] **Step 4: Test old subcommands are gone**

Run: `node cx/dist/cli.mjs projects`

Expected: TUI launches (treats "projects" as a query/question), NOT the old table output. The word "projects" becomes the `initialQuery`.

- [ ] **Step 5: Commit final build**

```bash
git add cx/dist/cli.mjs
git commit -m "build: compile consolidated TUI CLI"
```
