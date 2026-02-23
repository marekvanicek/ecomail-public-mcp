import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EcomailClient } from '../ecomail.js';

export function addTransactionTools(server: McpServer, ecomail: EcomailClient) {
  server.registerTool(
    'create-transaction',
    {
      title: 'Create Transaction',
      description:
        'Create a new e-commerce transaction for a subscriber. Timestamps are in UTC.',
      inputSchema: {
        order_id: z.string().describe('Your unique order/transaction ID'),
        email: z.email().describe("Subscriber's email"),
        shop: z
          .string()
          .optional()
          .describe('Shop name (case sensitive, used in segment conditionals)'),
        amount: z.number().describe('Total amount including tax and shipping'),
        tax: z.number().optional().describe('Tax amount'),
        shipping: z.number().optional().describe('Shipping amount'),
        city: z.string().optional().describe('Delivery city'),
        county: z.string().optional().describe('Delivery county'),
        country: z.string().optional().describe('Delivery country'),
        timestamp: z
          .number()
          .optional()
          .describe('Unix timestamp of the transaction'),
        status: z
          .enum(['processing', 'canceled', 'pending', 'completed'])
          .optional()
          .describe('Transaction status'),
        transaction_items: z
          .array(
            z.object({
              code: z.string().describe('Product code'),
              title: z.string().describe('Product name'),
              categories: z
                .array(z.string())
                .optional()
                .describe('Product categories'),
              price: z.number().describe('Total price for quantity'),
              amount: z.number().describe('Quantity'),
              tags: z.array(z.string()).optional().describe('Item tags'),
            }),
          )
          .optional()
          .describe('Array of transaction items'),
      },
    },
    async ({ transaction_items, ...txFields }) => {
      const transaction: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(txFields)) {
        if (v !== undefined) transaction[k] = v;
      }

      const body: Record<string, unknown> = { transaction };
      if (transaction_items) body.transaction_items = transaction_items;

      const response = await ecomail.post<any>('/tracker/transaction', body);

      return {
        content: [
          {
            type: 'text',
            text: `Transaction created!\nID: ${response.id}\nOrder: ${response.order_id}\nEmail: ${response.email}\nAmount: ${response.amount}\nStatus: ${response.status || 'N/A'}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'create-bulk-transactions',
    {
      title: 'Create Bulk Transactions',
      description:
        'Create multiple e-commerce transactions in a single request. Max 1000 per call. Does NOT trigger automations.',
      inputSchema: {
        transaction_data: z
          .array(
            z.object({
              transaction: z.object({
                order_id: z.string(),
                email: z.email(),
                shop: z.string().optional(),
                amount: z.number(),
                tax: z.number().optional(),
                shipping: z.number().optional(),
                city: z.string().optional(),
                timestamp: z.number().optional(),
                status: z
                  .enum(['processing', 'canceled', 'pending', 'completed'])
                  .optional(),
              }),
              transaction_items: z
                .array(
                  z.object({
                    code: z.string(),
                    title: z.string(),
                    categories: z.array(z.string()).optional(),
                    price: z.number(),
                    amount: z.number(),
                  }),
                )
                .optional(),
            }),
          )
          .min(1)
          .max(1000)
          .describe('Array of transaction objects (max 1000)'),
      },
    },
    async ({ transaction_data }) => {
      const response = await ecomail.post<{ inserts: number }>(
        '/tracker/transaction-bulk',
        { transaction_data },
      );

      return {
        content: [
          {
            type: 'text',
            text: `Bulk transactions created. ${response.inserts} transaction(s) inserted.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-transactions',
    {
      title: 'Get Transactions',
      description:
        'Retrieve a paginated list of transactions with optional filters.',
      inputSchema: {
        shop: z.string().optional().describe('Filter by shop name'),
        email: z.string().optional().describe('Filter by email'),
        from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
        to: z.string().optional().describe('End date (YYYY-MM-DD)'),
        per_page: z
          .number()
          .max(500)
          .optional()
          .describe('Results per page (max 500)'),
        page: z.number().optional().describe('Page number'),
      },
    },
    async (params) => {
      const query: Record<string, string | number | undefined> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) query[k] = v;
      }

      const response = await ecomail.get<any>('/tracker/transaction', query);

      if (!response.data || response.data.length === 0) {
        return {
          content: [{ type: 'text', text: 'No transactions found.' }],
        };
      }

      const txList = response.data
        .map((t: any) => {
          const items =
            t.items?.map((i: any) => `${i.title} x${i.amount}`).join(', ') ||
            'no items';
          return `- Order: ${t.order_id} | ${t.email} | Shop: ${t.shop || 'N/A'} | Amount: ${t.amount} | Status: ${t.status || 'N/A'} | Items: ${items}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Transactions (page ${response.current_page}, ${response.total} total):\n\n${txList}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'update-transaction',
    {
      title: 'Update Transaction',
      description:
        'Overwrite an existing transaction with new data. This replaces the entire order.',
      inputSchema: {
        order_id: z.string().describe('Order ID to update'),
        email: z.email().describe("Subscriber's email"),
        shop: z.string().optional().describe('Shop name'),
        amount: z.number().describe('Total amount'),
        tax: z.number().optional().describe('Tax amount'),
        shipping: z.number().optional().describe('Shipping amount'),
        city: z.string().optional().describe('Delivery city'),
        county: z.string().optional().describe('Delivery county'),
        country: z.string().optional().describe('Delivery country'),
        timestamp: z.number().optional().describe('Unix timestamp'),
        status: z
          .enum(['processing', 'canceled', 'pending', 'completed'])
          .optional()
          .describe('Transaction status'),
        transaction_items: z
          .array(
            z.object({
              code: z.string(),
              title: z.string(),
              categories: z.array(z.string()).optional(),
              price: z.number(),
              amount: z.number(),
              tags: z.array(z.string()).optional(),
            }),
          )
          .optional()
          .describe('Transaction items'),
      },
    },
    async ({ order_id, transaction_items, ...txFields }) => {
      const transaction: Record<string, unknown> = { order_id };
      for (const [k, v] of Object.entries(txFields)) {
        if (v !== undefined) transaction[k] = v;
      }

      const body: Record<string, unknown> = { transaction };
      if (transaction_items) body.transaction_items = transaction_items;

      await ecomail.put(
        `/tracker/transaction/${encodeURIComponent(order_id)}`,
        body,
      );

      return {
        content: [
          {
            type: 'text',
            text: `Transaction "${order_id}" updated successfully.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'delete-transaction',
    {
      title: 'Delete Transaction',
      description:
        'Delete a single transaction by order ID. Optionally filter by shop.',
      inputSchema: {
        order_id: z.string().describe('Order ID to delete'),
        shop: z
          .string()
          .optional()
          .describe('If provided, only delete if matching this shop'),
      },
    },
    async ({ order_id, shop }) => {
      const body: Record<string, unknown> = {};
      if (shop) body.transaction_data = { shop };

      await ecomail.delete(
        `/tracker/transaction/${encodeURIComponent(order_id)}/delete`,
        body,
      );

      return {
        content: [
          {
            type: 'text',
            text: `Transaction "${order_id}" deleted.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'delete-bulk-transactions',
    {
      title: 'Delete Bulk Transactions',
      description:
        'Delete multiple transactions in a single request. Max 1000 per call.',
      inputSchema: {
        transaction_data: z
          .array(
            z.object({
              order_id: z.string().describe('Order ID'),
              shop: z.string().optional().describe('Optional shop filter'),
            }),
          )
          .min(1)
          .max(1000)
          .describe('Array of transaction identifiers (max 1000)'),
      },
    },
    async ({ transaction_data }) => {
      const response = await ecomail.delete<{ deleted: number }>(
        '/tracker/transaction/delete-bulk',
        { transaction_data },
      );

      return {
        content: [
          {
            type: 'text',
            text: `${response.deleted} transaction(s) deleted.`,
          },
        ],
      };
    },
  );
}
