import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EcomailClient } from '../ecomail.js';

export function addCouponTools(server: McpServer, ecomail: EcomailClient) {
  server.registerTool(
    'import-coupons',
    {
      title: 'Import Discount Coupons',
      description: 'Import discount coupons into a default or specific folder.',
      inputSchema: {
        codes: z
          .array(z.string())
          .min(1)
          .describe('Array of coupon code strings'),
        folderId: z
          .number()
          .optional()
          .describe(
            'Folder ID. If not provided, imports into the default folder.',
          ),
        valid_until: z
          .string()
          .optional()
          .describe('Expiration date (YYYY-MM-DD)'),
        update_existing: z
          .boolean()
          .optional()
          .describe('Update existing coupons if they already exist'),
      },
    },
    async ({ codes, folderId, valid_until, update_existing }) => {
      const body: Record<string, unknown> = { codes };
      if (folderId !== undefined) body.folderId = folderId;
      if (valid_until) body.valid_until = valid_until;
      if (update_existing !== undefined) body.update_existing = update_existing;

      const response = await ecomail.post<any>('/coupons/import', body);

      return {
        content: [
          {
            type: 'text',
            text: `Coupons imported!\nImported: ${response.imported}\nDuplicated: ${response.duplicated}\nTotal: ${response.totalCount}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'delete-coupons',
    {
      title: 'Delete Discount Coupons',
      description: 'Delete discount coupons from a default or specific folder.',
      inputSchema: {
        codes: z
          .array(z.string())
          .min(1)
          .describe('Array of coupon code strings to delete'),
        folderId: z
          .number()
          .optional()
          .describe(
            'Folder ID. If not provided, deletes from the default folder.',
          ),
      },
    },
    async ({ codes, folderId }) => {
      const body: Record<string, unknown> = { codes };
      if (folderId !== undefined) body.folderId = folderId;

      const response = await ecomail.delete<any>('/coupons/delete', body);

      return {
        content: [
          {
            type: 'text',
            text: `Coupons deleted: ${response.deleted}\nInvalid: ${response.invalid}`,
          },
        ],
      };
    },
  );
}
