import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EcomailClient } from '../ecomail.js';

export function addDomainTools(server: McpServer, ecomail: EcomailClient) {
  server.registerTool(
    'list-domains',
    {
      title: 'List Domains',
      description: 'Retrieve all domains in your Ecomail account.',
      inputSchema: {},
    },
    async () => {
      const response = await ecomail.get<any[]>('/domains');

      if (!response || response.length === 0) {
        return {
          content: [{ type: 'text', text: 'No domains found.' }],
        };
      }

      const list = response
        .map(
          (d) => `- ID: ${d.id} | ${d.name} | Valid: ${d.valid ? 'yes' : 'no'}`,
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${response.length} domain(s):\n\n${list}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'create-domain',
    {
      title: 'Create Domain',
      description: 'Add a new sending domain to your Ecomail account.',
      inputSchema: {
        name: z.string().describe('Domain name (e.g. "example.com")'),
      },
    },
    async ({ name }) => {
      const response = await ecomail.post<any>('/domains', { name });

      return {
        content: [
          {
            type: 'text',
            text: `Domain created!\nID: ${response.id}\nName: ${response.name}\nValid: ${response.valid ? 'yes' : 'no (needs DNS verification)'}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'delete-domain',
    {
      title: 'Delete Domain',
      description:
        'Remove a domain from your Ecomail account. Before using this, you MUST confirm with the user. This will stop email sending for that domain.',
      inputSchema: {
        domain_id: z.number().describe('Domain ID'),
      },
    },
    async ({ domain_id }) => {
      const response = await ecomail.delete<any>(`/domains/${domain_id}`);

      return {
        content: [
          {
            type: 'text',
            text: `Domain "${response.name}" (ID: ${response.id}) deleted.`,
          },
        ],
      };
    },
  );
}
