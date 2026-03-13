import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("volley", {
  highlight: {
    run(code: string, language: string): Promise<string> {
      return ipcRenderer.invoke("hljs:highlight", { code, language });
    },
    auto(code: string): Promise<string> {
      return ipcRenderer.invoke("hljs:highlightAuto", { code });
    },
  },
  pty: {
    write(sessionId: string, data: string): void {
      ipcRenderer.send("pty:write", { sessionId, data });
    },
    resize(sessionId: string, cols: number, rows: number): void {
      ipcRenderer.send("pty:resize", { sessionId, cols, rows });
    },
    kill(sessionId: string): void {
      ipcRenderer.send("pty:kill", { sessionId });
    },
    pause(sessionId: string): void {
      ipcRenderer.send("session:pause", { sessionId });
    },
    resume(sessionId: string): void {
      ipcRenderer.send("session:resume", { sessionId });
    },
    onData(callback: (payload: { sessionId: string; data: string }) => void): void {
      ipcRenderer.on("pty:data", (_event, payload) => callback(payload));
    },
    onExit(callback: (payload: { sessionId: string; exitCode: number; signal: number }) => void): void {
      ipcRenderer.on("pty:exit", (_event, payload) => callback(payload));
    },
  },
  fs: {
    readdir(relativePath: string, basePath?: string): Promise<{ name: string; path: string; isDirectory: boolean }[]> {
      return ipcRenderer.invoke("fs:readdir", { relativePath, basePath });
    },
    readfile(relativePath: string, basePath?: string): Promise<{ relativePath: string; content: string; size: number; truncated: boolean } | null> {
      return ipcRenderer.invoke("fs:readfile", { relativePath, basePath });
    },
    repoRoot(basePath?: string): Promise<string> {
      return ipcRenderer.invoke("fs:reporoot", basePath ? { basePath } : undefined);
    },
  },
  ready(): void {
    ipcRenderer.send("renderer:ready");
  },
  session: {
    start(task: string, baseBranch?: string): void {
      ipcRenderer.send("session:start", { task, baseBranch });
    },
    onOpened(callback: (session: { id: string; slug: string; branch: string; worktreePath: string; task: string; lifecycle?: string; completedAt?: string; mergedTo?: string; pendingId?: string; todoType?: string; description?: string; planStatus?: string; planMarkdown?: string; sourceNoteId?: string | null; folderId?: string | null }) => void): void {
      ipcRenderer.on("session:opened", (_event, session) => callback(session));
    },
    onAutoStart(callback: (payload: { sessionId: string }) => void): void {
      ipcRenderer.on("session:auto-start", (_event, payload) => callback(payload));
    },
    onClosed(callback: (payload: { sessionId: string }) => void): void {
      ipcRenderer.on("session:closed", (_event, payload) => callback(payload));
    },
    onPending(callback: (payload: { pendingId: string; task: string }) => void): void {
      ipcRenderer.on("session:pending", (_event, payload) => callback(payload));
    },
    onSetupOutput(callback: (payload: { pendingId: string; data: string }) => void): void {
      ipcRenderer.on("session:setup-output", (_event, payload) => callback(payload));
    },
    onSetupFailed(callback: (payload: { pendingId: string; error: string }) => void): void {
      ipcRenderer.on("session:setup-failed", (_event, payload) => callback(payload));
    },
    onSetupWarning(callback: (payload: { task: string; error: string }) => void): void {
      ipcRenderer.on("session:setup-warning", (_event, payload) => callback(payload));
    },
    remove(sessionId: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("session:remove", { sessionId });
    },
    createTodo(task: string, opts?: { todoType?: string; description?: string; sourceNoteId?: string }): Promise<{ ok: boolean; id?: string; error?: string }> {
      return ipcRenderer.invoke("session:create-todo", { task, ...opts });
    },
    updateTodo(sessionId: string, updates: { task?: string; todoType?: string; description?: string }): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("session:update-todo", { sessionId, ...updates });
    },
    startTodo(sessionId: string, baseBranch?: string): void {
      ipcRenderer.send("session:start-todo", { sessionId, baseBranch });
    },
    cancelSetup(pendingId: string): void {
      ipcRenderer.send("session:cancel-setup", { pendingId });
    },
    complete(sessionId: string, mergedTo?: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("session:complete", { sessionId, mergedTo });
    },
    delete(sessionId: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("session:delete", { sessionId });
    },
    reorder(ids: string[], lifecycle: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("session:reorder", { ids, lifecycle });
    },
    foldersList(): Promise<{ folders: any[] }> {
      return ipcRenderer.invoke("session:folders-list");
    },
    folderCreate(name: string): Promise<{ ok: boolean; folder?: any; error?: string }> {
      return ipcRenderer.invoke("session:folder-create", { name });
    },
    folderRename(id: string, name: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("session:folder-rename", { id, name });
    },
    folderDelete(id: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("session:folder-delete", { id });
    },
    folderReorder(ids: string[]): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("session:folder-reorder", { ids });
    },
    moveToFolder(sessionId: string, folderId: string | null): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("session:move-to-folder", { sessionId, folderId });
    },
  },
  git: {
    status(sessionId: string): Promise<{ dirty: boolean; files: string[]; error?: string }> {
      return ipcRenderer.invoke("git:status", { sessionId });
    },
    commit(sessionId: string, message: string, files?: string[]): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("git:commit", { sessionId, message, files });
    },
    push(sessionId: string): Promise<{ ok: boolean; prUrl?: string; error?: string }> {
      return ipcRenderer.invoke("git:push", { sessionId });
    },
    diffStat(sessionId: string): Promise<{ added: number; modified: number; deleted: number; hasConflicts: boolean }> {
      return ipcRenderer.invoke("git:diff-stat", { sessionId });
    },
    lineStat(sessionId: string): Promise<{ files: number; insertions: number; deletions: number }> {
      return ipcRenderer.invoke("git:line-stat", { sessionId });
    },
    sessionStatus(sessionId: string): Promise<{ uncommitted: number; unpushed: number; behind: number; hasConflicts: boolean }> {
      return ipcRenderer.invoke("git:session-status", { sessionId });
    },
    changes(sessionId: string): Promise<{ staged: { path: string; status: string }[]; unstaged: { path: string; status: string }[]; error?: string }> {
      return ipcRenderer.invoke("git:changes", { sessionId });
    },
    stage(sessionId: string, files: string[]): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("git:stage", { sessionId, files });
    },
    unstage(sessionId: string, files: string[]): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("git:unstage", { sessionId, files });
    },
    discard(sessionId: string, files: string[]): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("git:discard", { sessionId, files });
    },
    fileDiff(sessionId: string, filePath: string, staged: boolean): Promise<{ diff: string; error?: string }> {
      return ipcRenderer.invoke("git:file-diff", { sessionId, filePath, staged });
    },
    provider(sessionId: string): Promise<{ provider: "github" | "gitlab" | "bitbucket" | "unknown"; repoPath: string; webUrl: string; cliAvailable: boolean }> {
      return ipcRenderer.invoke("git:provider", { sessionId });
    },
    createPr(sessionId: string, title: string, body: string, base: string): Promise<{ ok: boolean; url?: string; prUrl?: string; error?: string }> {
      return ipcRenderer.invoke("git:create-pr", { sessionId, title, body, base });
    },
    mergeSource(sessionId: string): Promise<{ ok: boolean; output?: string; error?: string; conflicts?: string[] }> {
      return ipcRenderer.invoke("git:merge-source", { sessionId });
    },
    land(sessionId: string): Promise<{ ok: boolean; baseBranch?: string; error?: string }> {
      return ipcRenderer.invoke("git:land", { sessionId });
    },
    listBranches(): Promise<{ branches: { name: string; remote: boolean }[]; current: string }> {
      return ipcRenderer.invoke("git:list-branches");
    },
  },
  run: {
    start(sessionId: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("run:start", { sessionId });
    },
    stop(sessionId: string): void {
      ipcRenderer.send("run:stop", { sessionId });
    },
    write(sessionId: string, data: string): void {
      ipcRenderer.send("run:write", { sessionId, data });
    },
    resize(sessionId: string, cols: number, rows: number): void {
      ipcRenderer.send("run:resize", { sessionId, cols, rows });
    },
    onData(callback: (payload: { sessionId: string; data: string }) => void): void {
      ipcRenderer.on("run:data", (_event, payload) => callback(payload));
    },
    onExit(callback: (payload: { sessionId: string; exitCode: number; signal: number }) => void): void {
      ipcRenderer.on("run:exit", (_event, payload) => callback(payload));
    },
  },
  config: {
    getStartCommand(): Promise<{ command: string | null }> {
      return ipcRenderer.invoke("config:get-start");
    },
    getLogPath(): Promise<{ path: string }> {
      return ipcRenderer.invoke("config:get-log-path");
    },
    openLogFile(): Promise<{ ok: boolean }> {
      return ipcRenderer.invoke("config:open-log-file");
    },
  },
  settings: {
    getUser(): Promise<any> {
      return ipcRenderer.invoke("settings:get-user");
    },
    setUser(settings: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("settings:set-user", settings);
    },
    getProject(): Promise<any> {
      return ipcRenderer.invoke("settings:get-project");
    },
    setProject(config: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("settings:set-project", config);
    },
    testConnection(apiKey: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("settings:test-connection", { apiKey });
    },
    checkEnvKey(): Promise<{ hasEnvKey: boolean }> {
      return ipcRenderer.invoke("settings:check-env-key");
    },
    claudeAuthStatus(): Promise<{ installed: boolean; loggedIn: boolean; email?: string }> {
      return ipcRenderer.invoke("settings:claude-auth-status");
    },
    claudeLogin(): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("settings:claude-login");
    },
  },
  agent: {
    send(sessionId: string, prompt: string, images?: { base64: string; mediaType: string }[]): void {
      ipcRenderer.send("agent:send", { sessionId, prompt, images });
    },
    saveImage(sessionId: string, base64: string, mediaType: string): Promise<{ path: string | null; error?: string }> {
      return ipcRenderer.invoke("agent:save-image", { sessionId, base64, mediaType });
    },
    interrupt(sessionId: string): void {
      ipcRenderer.send("agent:interrupt", { sessionId });
    },
    history(sessionId: string): Promise<any[]> {
      return ipcRenderer.invoke("agent:history", { sessionId });
    },
    listSkills(): Promise<{ name: string; description: string; content: string }[]> {
      return ipcRenderer.invoke("agent:list-skills");
    },
    onMessage(callback: (payload: { sessionId: string; message: any }) => void): void {
      ipcRenderer.on("agent:message", (_event, payload) => callback(payload));
    },
    onDone(callback: (payload: { sessionId: string }) => void): void {
      ipcRenderer.on("agent:done", (_event, payload) => callback(payload));
    },
    onError(callback: (payload: { sessionId: string; error: string }) => void): void {
      ipcRenderer.on("agent:error", (_event, payload) => callback(payload));
    },
  },
  project: {
    list(): Promise<{ projects: { id: string; name: string; path: string }[]; activeProjectId: string | null }> {
      return ipcRenderer.invoke("project:list");
    },
    add(repoPath: string): Promise<{ ok: boolean; project?: { id: string; name: string; path: string }; error?: string }> {
      return ipcRenderer.invoke("project:add", { repoPath });
    },
    remove(projectId: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("project:remove", { projectId });
    },
    switch(projectId: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("project:switch", { projectId });
    },
    pickFolder(): Promise<{ path: string | null }> {
      return ipcRenderer.invoke("project:pick-folder");
    },
    onSwitched(callback: (payload: { projectId: string | null; projectName: string; projectPath: string }) => void): void {
      ipcRenderer.on("project:switched", (_event, payload) => callback(payload));
    },
  },
  planning: {
    analyzeProject(): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("planning:analyze-project");
    },
    contextStatus(): Promise<{ exists: boolean; analyzing: boolean; updatedAt?: string }> {
      return ipcRenderer.invoke("planning:context-status");
    },
    onAnalyzeStatus(callback: (payload: { status: string; error?: string }) => void): void {
      ipcRenderer.on("planning:analyze-status", (_event, payload) => callback(payload));
    },
  },
  notes: {
    list(): Promise<{ notes: any[] }> {
      return ipcRenderer.invoke("notes:list");
    },
    create(title: string): Promise<{ ok: boolean; note?: any; error?: string }> {
      return ipcRenderer.invoke("notes:create", { title });
    },
    update(id: string, updates: { title?: string; content?: string }): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("notes:update", { id, ...updates });
    },
    archive(id: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("notes:archive", { id });
    },
    unarchive(id: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("notes:unarchive", { id });
    },
    delete(id: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("notes:delete", { id });
    },
    extractTodos(noteId: string, content: string): Promise<{ ok: boolean; drafts?: any[]; error?: string }> {
      return ipcRenderer.invoke("notes:extract-todos", { noteId, content });
    },
    onExtractProgress(callback: (payload: { noteId: string; phase: string }) => void): void {
      ipcRenderer.on("notes:extract-progress", (_event, payload) => callback(payload));
    },
    continueTodos(noteId: string, partialResult: string): Promise<{ ok: boolean; drafts?: any[]; error?: string }> {
      return ipcRenderer.invoke("notes:continue-extraction", { noteId, partialResult });
    },
    loadExtractions(): Promise<{ extractions: Record<string, any> }> {
      return ipcRenderer.invoke("notes:extractions-load");
    },
    saveExtractions(extractions: Record<string, any>): Promise<{ ok: boolean }> {
      return ipcRenderer.invoke("notes:extractions-save", { extractions });
    },
    addTodoIds(noteId: string, todoIds: string[]): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("notes:add-todo-ids", { noteId, todoIds });
    },
    reorder(ids: string[]): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("notes:reorder", { ids });
    },
    folderCreate(name: string): Promise<{ ok: boolean; folder?: any; error?: string }> {
      return ipcRenderer.invoke("notes:folder-create", { name });
    },
    folderRename(id: string, name: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("notes:folder-rename", { id, name });
    },
    folderDelete(id: string): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("notes:folder-delete", { id });
    },
    folderReorder(ids: string[]): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("notes:folder-reorder", { ids });
    },
    moveToFolder(noteId: string, folderId: string | null): Promise<{ ok: boolean; error?: string }> {
      return ipcRenderer.invoke("notes:move-to-folder", { noteId, folderId });
    },
  },
  openExternal(url: string): void {
    ipcRenderer.send("shell:openExternal", { url });
  },
});
