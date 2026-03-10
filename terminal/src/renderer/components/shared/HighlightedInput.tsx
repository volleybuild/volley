import React from "react";

interface Props {
  value: string;
  className?: string;
}

/**
 * Renders highlighted text overlay for input fields.
 * Highlights /skillname in mint color when it's a valid skill prefix.
 */
export function HighlightedInputOverlay({ value, className = "" }: Props) {
  // Check if value starts with a slash command (e.g., "/brainstorm something")
  const match = value.match(/^(\/\S+)(\s.*)?$/);

  if (!match) {
    // No skill command, render invisible (just for spacing)
    return (
      <span className={`${className} invisible`} aria-hidden="true">
        {value || " "}
      </span>
    );
  }

  const [, skillPart, restPart] = match;

  return (
    <span className={className} aria-hidden="true">
      <span className="text-accent-bright">{skillPart}</span>
      {restPart && <span className="text-transparent">{restPart}</span>}
    </span>
  );
}

/**
 * Parses input value and returns highlighted segments.
 * Used for rendering in message history.
 */
export function parseSkillHighlight(value: string): {
  skill: string | null;
  rest: string;
} {
  const match = value.match(/^(\/\S+)(\s.*)?$/);
  if (!match) {
    return { skill: null, rest: value };
  }
  return {
    skill: match[1],
    rest: match[2]?.trimStart() || "",
  };
}
