interface UserSettings {
  ai?: {
    anthropicKey?: string;
  };
}

interface VolleyProjectConfig {
  start?: string;
  terminal?: string;
  provider?: string;
  symlinks?: string[];
  setup?: string[];
  grid?: { maxColumns?: number; maxRows?: number };
}

type SessionLifecycle = "todo" | "in_progress" | "completed";
type TodoType = "bug" | "feature" | "improvement";
interface VolleyProject {
  id: string;
  name: string;
  path: string;
}

interface FolderData {
  id: string;
  name: string;
  order: number;
}

interface VolleySession {
  id: string;
  slug: string;
  branch: string;
  baseBranch?: string;
  worktreePath: string;
  task: string;
  lifecycle?: SessionLifecycle;
  completedAt?: string;
  mergedTo?: string;
  todoType?: TodoType;
  description?: string;
  planStatus?: string;
  planMarkdown?: string;
  sourceNoteId?: string | null;
  folderId?: string | null;
}

interface NoteData {
  id: string;
  title: string;
  content: string;
  status: "active" | "archived";
  todoIds: string[];
  createdAt: string;
  updatedAt: string;
  folderId?: string | null;
}

interface VolleyApi {
  highlight: {
    run(code: string, language: string): Promise<string>;
    auto(code: string): Promise<string>;
  };
  pty: {
    write(sessionId: string, data: string): void;
    resize(sessionId: string, cols: number, rows: number): void;
    kill(sessionId: string): void;
    onData(callback: (payload: { sessionId: string; data: string }) => void): void;
    onExit(callback: (payload: { sessionId: string; exitCode: number; signal: number }) => void): void;
  };
  fs: {
    readdir(relativePath: string, basePath?: string): Promise<{ name: string; path: string; isDirectory: boolean }[]>;
    readfile(relativePath: string, basePath?: string): Promise<{ relativePath: string; content: string; size: number; truncated: boolean } | null>;
    repoRoot(basePath?: string): Promise<string>;
  };
  session: {
    start(task: string, baseBranch?: string): void;
    onOpened(callback: (session: VolleySession & { pendingId?: string; todoType?: TodoType; description?: string; sourceNoteId?: string | null; folderId?: string | null }) => void): void;
    onAutoStart(callback: (payload: { sessionId: string }) => void): void;
    onClosed(callback: (payload: { sessionId: string }) => void): void;
    onPending(callback: (payload: { pendingId: string; task: string }) => void): void;
    onSetupOutput(callback: (payload: { pendingId: string; data: string }) => void): void;
    onSetupFailed(callback: (payload: { pendingId: string; error: string }) => void): void;
    onSetupWarning(callback: (payload: { task: string; error: string }) => void): void;
    remove(sessionId: string): Promise<{ ok: boolean; error?: string }>;
    createTodo(task: string, opts?: { todoType?: TodoType; description?: string; sourceNoteId?: string }): Promise<{ ok: boolean; id?: string; error?: string }>;
    updateTodo(sessionId: string, updates: { task?: string; todoType?: TodoType; description?: string }): Promise<{ ok: boolean; error?: string }>;
    startTodo(sessionId: string, baseBranch?: string): void;
    complete(sessionId: string, mergedTo?: string): Promise<{ ok: boolean; error?: string }>;
    delete(sessionId: string): Promise<{ ok: boolean; error?: string }>;
    reorder(ids: string[], lifecycle: string): Promise<{ ok: boolean; error?: string }>;
    foldersList(): Promise<{ folders: FolderData[] }>;
    folderCreate(name: string): Promise<{ ok: boolean; folder?: FolderData; error?: string }>;
    folderRename(id: string, name: string): Promise<{ ok: boolean; error?: string }>;
    folderDelete(id: string): Promise<{ ok: boolean; error?: string }>;
    folderReorder(ids: string[]): Promise<{ ok: boolean; error?: string }>;
    moveToFolder(sessionId: string, folderId: string | null): Promise<{ ok: boolean; error?: string }>;
  };
  git: {
    status(sessionId: string): Promise<{ dirty: boolean; files: string[]; error?: string }>;
    commit(sessionId: string, message: string, files?: string[]): Promise<{ ok: boolean; error?: string }>;
    push(sessionId: string): Promise<{ ok: boolean; prUrl?: string; error?: string }>;
    sessionStatus(sessionId: string): Promise<{ uncommitted: number; unpushed: number; behind: number; hasConflicts: boolean; sourceBranch: string }>;
    diffStat(sessionId: string): Promise<{ added: number; modified: number; deleted: number; hasConflicts: boolean }>;
    lineStat(sessionId: string): Promise<{ files: number; insertions: number; deletions: number }>;
    changes(sessionId: string): Promise<{ staged: { path: string; status: string }[]; unstaged: { path: string; status: string }[]; error?: string }>;
    stage(sessionId: string, files: string[]): Promise<{ ok: boolean; error?: string }>;
    unstage(sessionId: string, files: string[]): Promise<{ ok: boolean; error?: string }>;
    discard(sessionId: string, files: string[]): Promise<{ ok: boolean; error?: string }>;
    fileDiff(sessionId: string, filePath: string, staged: boolean): Promise<{ diff: string; error?: string }>;
    provider(sessionId: string): Promise<{
      provider: "github" | "gitlab" | "bitbucket" | "unknown";
      repoPath: string;
      webUrl: string;
      cliAvailable: boolean;
    }>;
    createPr(sessionId: string, title: string, body: string, base: string): Promise<{ ok: boolean; url?: string; prUrl?: string; error?: string }>;
    mergeSource(sessionId: string): Promise<{ ok: boolean; output?: string; error?: string; conflicts?: string[] }>;
    land(sessionId: string): Promise<{ ok: boolean; baseBranch?: string; error?: string }>;
    listBranches(): Promise<{ branches: { name: string; remote: boolean }[]; current: string }>;
  };
  run: {
    start(sessionId: string): Promise<{ ok: boolean; error?: string }>;
    stop(sessionId: string): void;
    write(sessionId: string, data: string): void;
    resize(sessionId: string, cols: number, rows: number): void;
    onData(callback: (payload: { sessionId: string; data: string }) => void): void;
    onExit(callback: (payload: { sessionId: string; exitCode: number; signal: number }) => void): void;
  };
  config: {
    getStartCommand(): Promise<{ command: string | null }>;
    getLogPath(): Promise<{ path: string }>;
    openLogFile(): Promise<{ ok: boolean }>;
  };
  settings: {
    getUser(): Promise<UserSettings>;
    setUser(settings: Partial<UserSettings>): Promise<{ ok: boolean; error?: string }>;
    getProject(): Promise<VolleyProjectConfig>;
    setProject(config: VolleyProjectConfig): Promise<{ ok: boolean; error?: string }>;
    testConnection(apiKey: string): Promise<{ ok: boolean; error?: string }>;
    checkEnvKey(): Promise<{ hasEnvKey: boolean }>;
    claudeAuthStatus(): Promise<{ installed: boolean; loggedIn: boolean; email?: string }>;
    claudeLogin(): Promise<{ ok: boolean; error?: string }>;
  };
  agent: {
    send(sessionId: string, prompt: string, images?: { base64: string; mediaType: string }[]): void;
    saveImage(sessionId: string, base64: string, mediaType: string): Promise<{ path: string | null; error?: string }>;
    interrupt(sessionId: string): void;
    history(sessionId: string): Promise<any[]>;
    listSkills(): Promise<{ name: string; description: string; content: string }[]>;
    onMessage(callback: (payload: { sessionId: string; message: any }) => void): void;
    onDone(callback: (payload: { sessionId: string }) => void): void;
    onError(callback: (payload: { sessionId: string; error: string }) => void): void;
  };
  project: {
    list(): Promise<{ projects: VolleyProject[]; activeProjectId: string | null }>;
    add(repoPath: string): Promise<{ ok: boolean; project?: VolleyProject; error?: string }>;
    remove(projectId: string): Promise<{ ok: boolean; error?: string }>;
    switch(projectId: string): Promise<{ ok: boolean; error?: string }>;
    pickFolder(): Promise<{ path: string | null }>;
    onSwitched(callback: (payload: { projectId: string | null; projectName: string; projectPath: string }) => void): void;
  };
  planning: {
    analyzeProject(): Promise<{ ok: boolean; error?: string }>;
    contextStatus(): Promise<{ exists: boolean; analyzing: boolean; updatedAt?: string }>;
    onAnalyzeStatus(callback: (payload: { status: string; error?: string }) => void): void;
  };
  notes: {
    list(): Promise<{ notes: NoteData[]; folders: FolderData[] }>;
    create(title: string): Promise<{ ok: boolean; note?: NoteData; error?: string }>;
    update(id: string, updates: { title?: string; content?: string }): Promise<{ ok: boolean; error?: string }>;
    archive(id: string): Promise<{ ok: boolean; error?: string }>;
    unarchive(id: string): Promise<{ ok: boolean; error?: string }>;
    delete(id: string): Promise<{ ok: boolean; error?: string }>;
    extractTodos(noteId: string, content: string): Promise<{ ok: boolean; drafts?: { title: string; type: "bug" | "feature" | "improvement"; description: string }[]; error?: string }>;
    onExtractProgress(callback: (payload: { noteId: string; phase: string }) => void): void;
    continueTodos(noteId: string, partialResult: string): Promise<{ ok: boolean; drafts?: { title: string; type: "bug" | "feature" | "improvement"; description: string }[]; error?: string }>;
    loadExtractions(): Promise<{ extractions: Record<string, any> }>;
    saveExtractions(extractions: Record<string, any>): Promise<{ ok: boolean }>;
    addTodoIds(noteId: string, todoIds: string[]): Promise<{ ok: boolean; error?: string }>;
    reorder(ids: string[]): Promise<{ ok: boolean; error?: string }>;
    folderCreate(name: string): Promise<{ ok: boolean; folder?: FolderData; error?: string }>;
    folderRename(id: string, name: string): Promise<{ ok: boolean; error?: string }>;
    folderDelete(id: string): Promise<{ ok: boolean; error?: string }>;
    folderReorder(ids: string[]): Promise<{ ok: boolean; error?: string }>;
    moveToFolder(noteId: string, folderId: string | null): Promise<{ ok: boolean; error?: string }>;
  };
  openExternal(url: string): void;
  ready(): void;
}

interface Window {
  volley: VolleyApi;
}
