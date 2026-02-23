import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { EcomailClient } from '../ecomail.js';

export function addListTools(server: McpServer, ecomail: EcomailClient) {
  server.registerTool(
    'list-lists',
    {
      title: 'View All Lists',
      description: `Retrieve all subscriber lists in your Ecomail account. Returns list names, sender info, and configuration.

**When to use:** User asks "show my lists", "what lists do I have?", needs to find a list ID.`,
      inputSchema: {},
    },
    async () => {
      const response = await ecomail.get<any[]>('/lists');

      if (!response || response.length === 0) {
        return {
          content: [{ type: 'text', text: 'No lists found.' }],
        };
      }

      const listText = response
        .map(
          (l) =>
            `- ID: ${l.id} | ${l.name} | From: ${l.from_name} <${l.from_email}> | Reply-To: ${l.reply_to || 'not set'} | Double opt-in: ${l.double_optin ? 'yes' : 'no'}`,
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${response.length} list(s):\n\n${listText}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'create-list',
    {
      title: 'Create List',
      description: 'Create a new subscriber list in your Ecomail account.',
      inputSchema: {
        name: z.string().describe('List name'),
        from_name: z.string().describe('Sender name used in emails'),
        from_email: z.email().describe('Sender email address'),
        reply_to: z.string().describe('Reply-to email address'),
      },
    },
    async ({ name, from_name, from_email, reply_to }) => {
      const response = await ecomail.post<{ name: string; id: number }>(
        '/lists',
        { name, from_name, from_email, reply_to },
      );

      return {
        content: [
          {
            type: 'text',
            text: `List created successfully!\nName: ${response.name}\nID: ${response.id}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-list',
    {
      title: 'Show List Detail',
      description:
        'Retrieve detailed information about a specific list, including custom fields, groups, segments, and subscriber counts.',
      inputSchema: {
        list_id: z.number().describe('ID of the list'),
      },
    },
    async ({ list_id }) => {
      const response = await ecomail.get<any>(`/lists/${list_id}`);

      const list = response.list;
      const subs = response.subscribers;

      let details = `List: ${list.name} (ID: ${list.id})\n`;
      details += `From: ${list.from_name} <${list.from_email}>\n`;
      details += `Reply-To: ${list.reply_to || 'not set'}\n`;
      details += `Double Opt-in: ${list.double_optin ? 'yes' : 'no'}\n`;
      details += `Created: ${list.created}\n`;
      details += `Active Subscribers: ${list.active_subscribers}\n`;
      details += `\nSubscriber Breakdown:\n`;
      details += `  Subscribed: ${subs.subscribed}\n`;
      details += `  Unsubscribed: ${subs.unsubscribed}\n`;
      details += `  Unconfirmed: ${subs.unconfirmed}\n`;
      details += `  Soft Bounced: ${subs.soft_bounced}\n`;
      details += `  Hard Bounced: ${subs.hard_bounced}\n`;
      details += `  Complained: ${subs.complained}\n`;

      if (list.custom_fields && Object.keys(list.custom_fields).length > 0) {
        details += `\nCustom Fields:\n`;
        for (const [key, field] of Object.entries(list.custom_fields) as [
          string,
          any,
        ][]) {
          details += `  - ${key}: ${field.name} (${field.type})\n`;
        }
      }

      if (list.segments && Object.keys(list.segments).length > 0) {
        details += `\nSegments:\n`;
        for (const seg of Object.values(list.segments) as any[]) {
          details += `  - ${seg.name} (ID: ${seg.id})\n`;
        }
      }

      if (list.groups && Object.keys(list.groups).length > 0) {
        details += `\nGroups:\n`;
        for (const grp of Object.values(list.groups) as any[]) {
          details += `  - ${grp.name} (ID: ${grp.id}, type: ${grp.type})\n`;
        }
      }

      return { content: [{ type: 'text', text: details }] };
    },
  );

  server.registerTool(
    'update-list',
    {
      title: 'Update List',
      description: 'Update an existing subscriber list.',
      inputSchema: {
        list_id: z.number().describe('ID of the list'),
        name: z.string().optional().describe('New list name'),
        from_name: z.string().optional().describe('Sender name'),
        from_email: z.email().optional().describe('Sender email'),
        reply_to: z.string().optional().describe('Reply-to email'),
      },
    },
    async ({ list_id, ...data }) => {
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) body[k] = v;
      }

      await ecomail.put(`/lists/${list_id}`, body);

      return {
        content: [
          { type: 'text', text: `List ${list_id} updated successfully.` },
        ],
      };
    },
  );

  server.registerTool(
    'get-subscribers',
    {
      title: 'Get Subscribers',
      description:
        'Retrieve a paginated list of subscribers from a specific list.',
      inputSchema: {
        list_id: z.number().describe('ID of the list'),
        page: z.number().optional().describe('Page number (default: 1)'),
        per_page: z
          .number()
          .max(5000)
          .optional()
          .describe('Subscribers per page (max 5000, default: 20)'),
        filter: z
          .enum(['unsubscribed', 'not_confirmed', 'bounced', 'complained'])
          .optional()
          .describe('Filter by subscriber status'),
      },
    },
    async ({ list_id, page, per_page, filter }) => {
      const query: Record<string, string | number | undefined> = {};
      if (page) query.page = page;
      if (per_page) query.per_page = per_page;
      if (filter) query.filter = filter;

      const response = await ecomail.get<any>(
        `/lists/${list_id}/subscribers`,
        query,
      );

      if (!response.data || response.data.length === 0) {
        return {
          content: [{ type: 'text', text: 'No subscribers found.' }],
        };
      }

      const subList = response.data
        .map((s: any) => {
          const sub = s.subscriber;
          return `- ${sub.email} | ${sub.name || ''} ${sub.surname || ''} | Status: ${s.status} | Source: ${s.source}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Subscribers (page ${response.current_page}, ${response.total} total):\n\n${subList}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-subscriber-from-list',
    {
      title: 'Get Subscriber from List',
      description:
        'Retrieve a specific subscriber from a list by their email address.',
      inputSchema: {
        list_id: z.number().describe('ID of the list'),
        email: z.email().describe('Email address of the subscriber'),
      },
    },
    async ({ list_id, email }) => {
      const response = await ecomail.get<any>(
        `/lists/${list_id}/subscriber/${encodeURIComponent(email)}`,
      );

      const s = response.subscriber;
      let details = `Subscriber: ${s.email}\n`;
      details += `Name: ${s.name || ''} ${s.surname || ''}\n`;
      details += `Status: ${s.status}\n`;
      details += `Company: ${s.company || 'N/A'}\n`;
      details += `City: ${s.city || 'N/A'}\n`;
      details += `Country: ${s.country || 'N/A'}\n`;
      details += `Phone: ${s.phone || 'N/A'}\n`;
      details += `Gender: ${s.gender || 'N/A'}\n`;
      if (s.tags && s.tags.length > 0) {
        details += `Tags: ${s.tags.join(', ')}\n`;
      }
      if (s.custom_fields && Object.keys(s.custom_fields).length > 0) {
        details += `Custom Fields: ${JSON.stringify(s.custom_fields)}\n`;
      }

      return { content: [{ type: 'text', text: details }] };
    },
  );

  server.registerTool(
    'get-subscriber-by-phone',
    {
      title: 'Get Subscriber by Phone',
      description:
        'Retrieve a specific subscriber from a list by their phone number.',
      inputSchema: {
        list_id: z.number().describe('ID of the list'),
        phone: z
          .string()
          .describe(
            'Phone number of the subscriber (international format, e.g. +420777888999)',
          ),
      },
    },
    async ({ list_id, phone }) => {
      const response = await ecomail.get<any>(
        `/lists/${list_id}/subscriber-by-phone/${encodeURIComponent(phone)}`,
      );

      const s = response.subscriber;
      let details = `Subscriber found:\n`;
      details += `Email: ${s.email}\n`;
      details += `List ID: ${s.list_id}\n`;
      details += `Status: ${s.status}\n`;
      details += `Subscribed at: ${s.subscribed_at}\n`;
      if (s.custom_fields && Object.keys(s.custom_fields).length > 0) {
        details += `Custom Fields: ${JSON.stringify(s.custom_fields)}\n`;
      }

      return { content: [{ type: 'text', text: details }] };
    },
  );

  server.registerTool(
    'subscribe',
    {
      title: 'Add Subscriber to List',
      description: `Subscribe a new contact to a specific list. Supports custom fields, tags, groups, and automation triggers.

**Status codes:** 1 = subscribed, 2 = unsubscribed, 6 = unconfirmed.`,
      inputSchema: {
        list_id: z.number().describe('ID of the list'),
        email: z.email().describe("Subscriber's email address"),
        name: z.string().optional().describe('First name'),
        surname: z.string().optional().describe('Last name'),
        gender: z.enum(['male', 'female']).optional().describe('Gender'),
        company: z.string().optional().describe('Company name'),
        city: z.string().optional().describe('City'),
        street: z.string().optional().describe('Street address'),
        zip: z.string().optional().describe('ZIP code'),
        country: z.string().optional().describe('Country code'),
        phone: z.string().optional().describe('Phone number'),
        birthday: z.string().optional().describe('Birthday (YYYY-MM-DD)'),
        custom_fields: z
          .record(z.string(), z.any())
          .optional()
          .describe('Custom field values'),
        tags: z.array(z.string()).optional().describe('Subscriber tags'),
        groups: z
          .record(z.string(), z.array(z.string()))
          .optional()
          .describe(
            'Group assignments (e.g. { "grp_id": ["Category 1", "Category 2"] })',
          ),
        trigger_autoresponders: z
          .boolean()
          .optional()
          .describe('Trigger automations when added (default: false)'),
        update_existing: z
          .boolean()
          .optional()
          .describe('Update if subscriber already exists (default: false)'),
        resubscribe: z
          .boolean()
          .optional()
          .describe(
            'Force resubscribe if previously unsubscribed (default: false)',
          ),
        skip_confirmation: z
          .boolean()
          .optional()
          .describe('Skip double opt-in confirmation (default: false)'),
      },
    },
    async ({
      list_id,
      email,
      trigger_autoresponders,
      update_existing,
      resubscribe,
      skip_confirmation,
      ...subscriberFields
    }) => {
      const subscriber_data: Record<string, unknown> = { email };
      for (const [k, v] of Object.entries(subscriberFields)) {
        if (v !== undefined) subscriber_data[k] = v;
      }

      const body: Record<string, unknown> = { subscriber_data };
      if (trigger_autoresponders !== undefined)
        body.trigger_autoresponders = trigger_autoresponders;
      if (update_existing !== undefined) body.update_existing = update_existing;
      if (resubscribe !== undefined) body.resubscribe = resubscribe;
      if (skip_confirmation !== undefined)
        body.skip_confirmation = skip_confirmation;

      const response = await ecomail.post<any>(
        `/lists/${list_id}/subscribe`,
        body,
      );

      const already = response.already_subscribed
        ? ' (already subscribed)'
        : '';

      return {
        content: [
          {
            type: 'text',
            text: `Subscriber added successfully${already}!\nID: ${response.id}\nEmail: ${response.email}\nName: ${response.name || ''} ${response.surname || ''}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'subscribe-bulk',
    {
      title: 'Add Bulk Subscribers',
      description: `Subscribe multiple contacts to a list in a single request. Maximum 3000 subscribers per call. Always skips double opt-in.`,
      inputSchema: {
        list_id: z.number().describe('ID of the list'),
        subscriber_data: z
          .array(
            z.object({
              email: z.email().describe('Email address'),
              name: z.string().optional().describe('First name'),
              surname: z.string().optional().describe('Last name'),
              status: z
                .number()
                .optional()
                .describe(
                  'Status: 1=subscribed, 2=unsubscribed, 4=hard bounce',
                ),
              custom_fields: z
                .record(z.string(), z.any())
                .optional()
                .describe('Custom fields'),
              tags: z.array(z.string()).optional().describe('Tags'),
            }),
          )
          .min(1)
          .max(3000)
          .describe('Array of subscriber objects (max 3000)'),
        update_existing: z
          .boolean()
          .optional()
          .describe('Update existing subscribers'),
        resubscribe: z
          .boolean()
          .optional()
          .describe('Resubscribe previously unsubscribed'),
        trigger_autoresponders: z
          .boolean()
          .optional()
          .describe('Trigger automations'),
      },
    },
    async ({
      list_id,
      subscriber_data,
      update_existing,
      resubscribe,
      trigger_autoresponders,
    }) => {
      const body: Record<string, unknown> = { subscriber_data };
      if (update_existing !== undefined) body.update_existing = update_existing;
      if (resubscribe !== undefined) body.resubscribe = resubscribe;
      if (trigger_autoresponders !== undefined)
        body.trigger_autoresponders = trigger_autoresponders;

      const response = await ecomail.post<{ inserts: number }>(
        `/lists/${list_id}/subscribe-bulk`,
        body,
      );

      return {
        content: [
          {
            type: 'text',
            text: `Bulk subscribe completed. ${response.inserts} subscriber(s) inserted.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'unsubscribe',
    {
      title: 'Unsubscribe from List',
      description: 'Unsubscribe a subscriber from a specific list.',
      inputSchema: {
        list_id: z.number().describe('ID of the list'),
        email: z.email().describe('Email address to unsubscribe'),
      },
    },
    async ({ list_id, email }) => {
      const response = await ecomail.delete<any>(
        `/lists/${list_id}/unsubscribe`,
        { email },
      );

      return {
        content: [
          {
            type: 'text',
            text: `Unsubscribed ${response.email} from list ${response.list_id}. Status: ${response.status}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'update-subscriber',
    {
      title: 'Update Subscriber in List',
      description:
        'Update an existing subscriber in a specific list. Tags and groups overwrite current values.',
      inputSchema: {
        list_id: z.number().describe('ID of the list'),
        email: z.email().describe('Email of the subscriber to update'),
        name: z.string().optional().describe('First name'),
        surname: z.string().optional().describe('Last name'),
        gender: z.enum(['male', 'female']).optional().describe('Gender'),
        company: z.string().optional().describe('Company name'),
        city: z.string().optional().describe('City'),
        street: z.string().optional().describe('Street address'),
        zip: z.string().optional().describe('ZIP code'),
        country: z.string().optional().describe('Country code'),
        phone: z.string().optional().describe('Phone number'),
        birthday: z.string().optional().describe('Birthday (YYYY-MM-DD)'),
        custom_fields: z
          .record(z.string(), z.any())
          .optional()
          .describe('Custom field values'),
        tags: z
          .array(z.string())
          .optional()
          .describe('Tags (overwrites current)'),
        groups: z
          .record(z.string(), z.array(z.string()))
          .optional()
          .describe('Group assignments (overwrites current)'),
      },
    },
    async ({ list_id, email, ...subscriberFields }) => {
      const subscriber_data: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(subscriberFields)) {
        if (v !== undefined) subscriber_data[k] = v;
      }

      const response = await ecomail.put<any>(
        `/lists/${list_id}/update-subscriber`,
        { email, subscriber_data },
      );

      return {
        content: [
          {
            type: 'text',
            text: `Subscriber ${response.email} updated.\nID: ${response.id}\nName: ${response.name || ''} ${response.surname || ''}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-segments',
    {
      title: 'Get Segments',
      description: 'Retrieve all segments created in a specific list.',
      inputSchema: {
        list_id: z.number().describe('ID of the list'),
      },
    },
    async ({ list_id }) => {
      const response = await ecomail.get<any>(`/lists/${list_id}/segments`);

      const segments = response.segments;
      if (!segments || Object.keys(segments).length === 0) {
        return {
          content: [{ type: 'text', text: 'No segments found for this list.' }],
        };
      }

      const segList = Object.values(segments)
        .map(
          (s: any) => `- ${s.name} (ID: ${s.id}) | Count: ${s.count ?? 'N/A'}`,
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Segments:\n\n${segList}`,
          },
        ],
      };
    },
  );
}
