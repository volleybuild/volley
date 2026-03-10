const LANG_MAP: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  xml: "xml",
  html: "xml",
  css: "css",
  scss: "scss",
  less: "less",
  sql: "sql",
  md: "markdown",
  dockerfile: "dockerfile",
  makefile: "makefile",
  lua: "lua",
  r: "r",
  scala: "scala",
  zig: "rust",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hs: "haskell",
  ml: "ocaml",
  vim: "vim",
  graphql: "graphql",
  gql: "graphql",
  proto: "protobuf",
  tf: "hcl",
};

export function getLanguageFromPath(filePath: string): string | null {
  const name = filePath.split("/").pop()!.toLowerCase();

  // Handle extensionless filenames
  if (LANG_MAP[name]) return LANG_MAP[name];

  const ext = name.includes(".") ? name.split(".").pop()! : null;
  if (ext && LANG_MAP[ext]) return LANG_MAP[ext];

  return null;
}
