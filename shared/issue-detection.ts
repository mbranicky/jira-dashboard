/** Match complete Jira keys, never a fragment of another identifier. */
export function issueKeys(names: readonly (string | null | undefined)[]) {
  return [...new Set(names.flatMap(name => [...(name ?? '').matchAll(/(?<![A-Za-z0-9_])[A-Z][A-Z0-9_]*-[1-9]\d*(?![A-Za-z0-9_])/g)].map(match => match[0])))];
}
export function detectIssue(saved: string[], workspace: string[], agents: string[]) {
  for (const keys of [saved, issueKeys(workspace), issueKeys(agents)]) {
    const unique = [...new Set(keys)];
    if (unique.length > 1) return {status:'ambiguous' as const};
    if (unique.length === 1) return {status:'found' as const, key:unique[0]!};
  }
  return {status:'none' as const};
}
