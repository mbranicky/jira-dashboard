import {z} from 'zod';

// Verified against TWG 1.4.2: scope query reads Jira board configuration.
const response = z.object({
  apiVersion: z.literal('v2'),
  command: z.literal('jira.board.scope.query'),
  data: z.object({
    id: z.number().int().positive(), name: z.string().min(1),
    columnConfig: z.object({columns: z.array(z.object({
      name: z.string().min(1),
      statuses: z.array(z.object({id: z.string().min(1)})),
    })).min(1)}),
  }),
});

export function decodeTwgColumns(value: unknown, expectedBoardId: number) {
  const parsed = response.safeParse(value);
  if (!parsed.success) throw new Error('Incomplete or unsupported TWG board configuration.');
  const board = parsed.data.data;
  if (board.id !== expectedBoardId) throw new Error('TWG returned a different board.');
  return {
    boardId: board.id, name: board.name,
    columns: board.columnConfig.columns.map(column => ({
      name: column.name, statusIds: [...new Set(column.statuses.map(status => status.id))],
    })),
  };
}
