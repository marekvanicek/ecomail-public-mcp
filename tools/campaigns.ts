import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EcomailClient } from '../ecomail.js';

const STATUS_LABELS: Record<number, string> = {
  0: 'Draft',
  1: 'Preparing',
  2: 'Sending',
  3: 'Sent',
  4: 'Errored',
  7: 'Scheduled',
};

export function addCampaignTools(server: McpServer, ecomail: EcomailClient) {
  server.registerTool(
    'list-campaigns',
    {
      title: 'List Campaigns',
      description: `List all campaigns with pagination and filtering.

**Status codes:** 0=Draft, 1=Preparing, 2=Sending, 3=Sent, 4=Errored, 7=Scheduled.`,
      inputSchema: {
        per_page: z.number().optional().describe('Items per page'),
        title: z.string().optional().describe('Filter by campaign title'),
        subject: z.string().optional().describe('Filter by subject'),
        status: z.number().optional().describe('Filter by status code'),
        updated: z
          .string()
          .optional()
          .describe('Filter by updated date (YYYY-MM-DD)'),
        from: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
        to: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
        id: z.number().optional().describe('Filter by campaign ID'),
      },
    },
    async (params) => {
      const query: Record<string, string | number | undefined> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) query[k] = v;
      }

      const response = await ecomail.get<any[]>('/campaigns', query);

      if (!response || response.length === 0) {
        return {
          content: [{ type: 'text', text: 'No campaigns found.' }],
        };
      }

      const campaignList = response
        .map(
          (c) =>
            `- ID: ${c.id} | "${c.title}" | Subject: "${c.subject}" | Status: ${STATUS_LABELS[c.status] ?? c.status} | Recipients: ${c.recipients ?? 'N/A'} | Sent: ${c.sent_at || 'not sent'}`,
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${response.length} campaign(s):\n\n${campaignList}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'create-campaign',
    {
      title: 'Create Campaign',
      description:
        'Create a new email campaign. The campaign is created as a draft. Use send-campaign to queue it for sending.',
      inputSchema: {
        title: z.string().describe('Campaign title'),
        from_name: z.string().describe("Sender's name"),
        from_email: z.email().describe("Sender's email address"),
        reply_to: z.email().describe('Reply-to email address'),
        subject: z.string().describe('Campaign subject line'),
        html_text: z.string().describe('HTML content of the campaign'),
        recepient_lists: z
          .array(z.number())
          .describe('Array of list IDs to send to'),
      },
    },
    async (params) => {
      const response = await ecomail.post<any>('/campaigns', params);

      return {
        content: [
          {
            type: 'text',
            text: `Campaign created successfully!\nID: ${response.id}\nTitle: ${response.title}\nSubject: ${response.subject}\nStatus: Draft`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-campaign',
    {
      title: 'Get Campaign Detail',
      description:
        'Get detailed campaign information including statistics for sent campaigns.',
      inputSchema: {
        campaign_id: z.number().describe('Campaign ID'),
      },
    },
    async ({ campaign_id }) => {
      const response = await ecomail.get<any>(`/campaigns/${campaign_id}`);

      let details = `Campaign: ${response.title} (ID: ${response.id})\n`;
      details += `Subject: ${response.subject}\n`;
      details += `From: ${response.from_name} <${response.from_email}>\n`;
      details += `Reply-To: ${response.reply_to}\n`;
      details += `Status: ${STATUS_LABELS[response.status] ?? response.status}\n`;
      details += `Recipients: ${response.recipients ?? 'N/A'}\n`;
      details += `Sent: ${response.sent_at || 'not sent'}\n`;

      if (response.archive_url) {
        details += `Archive URL: ${response.archive_url}\n`;
      }

      if (response.stats) {
        const s = response.stats;
        details += `\nStatistics:\n`;
        details += `  Injected: ${s.inject}\n`;
        details += `  Sent: ${s.send}\n`;
        details += `  Delivered: ${s.delivered}\n`;
        details += `  Opens: ${s.open} (total: ${s.total_open})\n`;
        details += `  Clicks: ${s.click} (total: ${s.total_click})\n`;
        details += `  Open Rate: ${s.openrate}%\n`;
        details += `  Click Rate: ${s.clickrate}%\n`;
        details += `  Delivery Rate: ${s.delivery_rate}%\n`;
        details += `  Hard Bounces: ${s.hard_bounce}\n`;
        details += `  Spam: ${s.spam}\n`;
        details += `  Unsubscribes: ${s.unsub}\n`;
      }

      return { content: [{ type: 'text', text: details }] };
    },
  );

  server.registerTool(
    'update-campaign',
    {
      title: 'Update Campaign',
      description:
        'Update an existing campaign. Only draft campaigns can be updated.',
      inputSchema: {
        campaign_id: z.number().describe('Campaign ID'),
        title: z.string().optional().describe('Campaign title'),
        from_name: z.string().optional().describe("Sender's name"),
        from_email: z.email().optional().describe("Sender's email"),
        reply_to: z.email().optional().describe('Reply-to email'),
        subject: z.string().optional().describe('Subject line'),
        html_text: z.string().optional().describe('HTML content'),
        recepient_lists: z
          .array(z.number())
          .optional()
          .describe('Array of list IDs'),
      },
    },
    async ({ campaign_id, ...data }) => {
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) body[k] = v;
      }

      const response = await ecomail.put<any>(
        `/campaigns/${campaign_id}`,
        body,
      );

      return {
        content: [
          {
            type: 'text',
            text: `Campaign ${response.id} updated.\nTitle: ${response.title}\nSubject: ${response.subject}\nStatus: ${STATUS_LABELS[response.status] ?? response.status}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'send-campaign',
    {
      title: 'Send Campaign',
      description:
        'Put a campaign in the sending queue immediately. This action is IRREVERSIBLE. Only draft campaigns can be sent. You MUST confirm with the user before sending.',
      inputSchema: {
        campaign_id: z.number().describe('Campaign ID to send'),
      },
    },
    async ({ campaign_id }) => {
      const response = await ecomail.get<any>(`/campaign/${campaign_id}/send`);

      const campaign = Array.isArray(response) ? response[0] : response;

      return {
        content: [
          {
            type: 'text',
            text: `Campaign "${campaign.title}" (ID: ${campaign.id}) has been queued for sending.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-campaign-stats',
    {
      title: 'Get Campaign Stats',
      description: 'Get aggregated statistics for a specific campaign.',
      inputSchema: {
        campaign_id: z.number().describe('Campaign ID'),
      },
    },
    async ({ campaign_id }) => {
      const response = await ecomail.get<any>(
        `/campaigns/${campaign_id}/stats`,
      );

      const s = response.stats;
      let text = `Campaign ${campaign_id} Statistics:\n`;
      text += `  Injected: ${s.inject}\n`;
      text += `  Delivered: ${s.delivery}\n`;
      text += `  Delivery Rate: ${s.delivery_rate}%\n`;
      text += `  Opens: ${s.open} (total: ${s.total_open})\n`;
      text += `  Open Rate: ${s.open_rate}%\n`;
      text += `  Clicks: ${s.click} (total: ${s.total_click})\n`;
      text += `  Click Rate: ${s.click_rate}%\n`;
      text += `  Bounces: ${s.bounce} (${s.bounce_rate}%)\n`;
      text += `  Spam: ${s.spam} (${s.spam_rate}%)\n`;
      text += `  Unsubscribes: ${s.unsub} (${s.unsub_rate}%)\n`;
      text += `  Conversions: ${s.conversions} (value: ${s.conversions_value})`;

      return { content: [{ type: 'text', text }] };
    },
  );

  server.registerTool(
    'get-campaign-stats-detail',
    {
      title: 'Get Campaign Stats Detail',
      description:
        'Get per-subscriber statistics for a campaign. Returns individual event counts for each subscriber.',
      inputSchema: {
        campaign_id: z.number().describe('Campaign ID'),
        type: z
          .enum([
            'open',
            'send',
            'unsub',
            'soft_bounce',
            'click',
            'hard_bounce',
            'out_of_band',
            'spam',
          ])
          .optional()
          .describe('Filter by event type'),
        email: z.string().optional().describe('Filter by email'),
        from: z
          .string()
          .optional()
          .describe('Filter from date (YYYY-MM-DD, UTC)'),
        per_page: z
          .number()
          .max(100)
          .optional()
          .describe('Results per page (max 100)'),
        page: z.number().optional().describe('Page number'),
      },
    },
    async ({ campaign_id, ...params }) => {
      const query: Record<string, string | number | undefined> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) query[k] = v;
      }

      const response = await ecomail.get<any>(
        `/campaigns/${campaign_id}/stats-detail`,
        query,
      );

      if (
        !response.subscribers ||
        Object.keys(response.subscribers).length === 0
      ) {
        return {
          content: [
            {
              type: 'text',
              text: 'No detailed stats found for this campaign.',
            },
          ],
        };
      }

      const subStats = Object.entries(response.subscribers)
        .map(([email, stats]: [string, any]) => {
          const parts = Object.entries(stats)
            .filter(([, v]) => (v as number) > 0)
            .map(([k, v]) => `${k}: ${v}`);
          return `- ${email}: ${parts.join(', ') || 'no events'}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Campaign ${campaign_id} Detail Stats (total: ${response.total}, page ${response.per_page} per page):\n\n${subStats}${response.next_page_url ? '\n\nMore pages available.' : ''}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-segment-stats',
    {
      title: 'Get Segment Stats',
      description:
        'Get performance statistics for a specific segment across all campaigns it was sent to.',
      inputSchema: {
        segment_id: z
          .string()
          .describe('Segment ID (can be retrieved from get-list)'),
      },
    },
    async ({ segment_id }) => {
      const response = await ecomail.get<any>(
        `/campaigns/segment/${encodeURIComponent(segment_id)}/stats`,
      );

      const stats = response.stats;
      if (!stats || Object.keys(stats).length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No stats found for this segment.',
            },
          ],
        };
      }

      const text = Object.entries(stats)
        .map(([campaignId, s]: [string, any]) => {
          return `Campaign ${campaignId}:\n  Injected: ${s.inject} | Delivered: ${s.delivery} (${s.delivery_rate}%)\n  Opens: ${s.open} (${s.open_rate}%) | Clicks: ${s.click} (${s.click_rate}%)\n  Bounces: ${s.bounce} (${s.bounce_rate}%) | Spam: ${s.spam} (${s.spam_rate}%)\n  Unsubscribes: ${s.unsub} (${s.unsub_rate}%)\n  Conversions: ${s.conversions} (value: ${s.conversions_value})`;
        })
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `Segment "${segment_id}" Statistics:\n\n${text}`,
          },
        ],
      };
    },
  );
}
