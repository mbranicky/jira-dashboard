/** Canonical board identity; equivalent Jira board URL layouts share a choice. */
export function sprintSelectionKey(boardUrl:string):string {
 try {
  const url=new URL(boardUrl);const match=url.pathname.match(/\/boards\/(\d+)\/?$/);
  if(match)return `${url.origin}/boards/${Number(match[1])}`;
 } catch {}
 return boardUrl.trim();
}
