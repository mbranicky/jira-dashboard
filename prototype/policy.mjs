export const readTools = new Set([
  'getAccessibleAtlassianResources', 'atlassianUserInfo', 'getJiraCurrentUser',
  'getJiraBoardConfig', 'getJiraBoardIssueData', 'getJiraBoardSprintData',
  'listJiraBoardSprints', 'searchJiraIssuesUsingJql', 'getJiraIssue',
  'listJiraIssueTransitions', 'listJiraBoards',
]);
export function assertRead(name) {
  if (!readTools.has(name)) throw new Error(`Tool is not permitted by the read-only prototype: ${name}`);
}
