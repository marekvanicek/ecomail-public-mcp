const BASE_URL = 'https://api2.ecomailapp.cz';

type QueryParams = Record<string, string | number | string[] | undefined>;

export class EcomailClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    query?: QueryParams,
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
          // Laravel reads arrays from the query string as key[]=a&key[]=b
          for (const item of value) {
            url.searchParams.append(`${key}[]`, item);
          }
        } else if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      key: this.apiKey,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = { method, headers };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      let detail = '';
      try {
        const json = await response.json();
        if (json.message) {
          detail = json.message;
        } else if (json.errors) {
          if (typeof json.errors === 'string') {
            detail = json.errors;
          } else if (Array.isArray(json.errors)) {
            detail = json.errors.join(', ');
          } else {
            detail = Object.entries(json.errors)
              .map(
                ([field, msgs]) =>
                  `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`,
              )
              .join('\n');
          }
        }
      } catch {
        detail = response.statusText;
      }
      throw new Error(
        `Ecomail API error (${response.status}): ${detail || response.statusText}`,
      );
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  async get<T>(path: string, query?: QueryParams): Promise<T> {
    return this.request<T>('GET', path, undefined, query);
  }

  async post<T>(
    path: string,
    body?: Record<string, unknown>,
    query?: QueryParams,
  ): Promise<T> {
    return this.request<T>('POST', path, body, query);
  }

  async put<T>(
    path: string,
    body?: Record<string, unknown>,
    query?: QueryParams,
  ): Promise<T> {
    return this.request<T>('PUT', path, body, query);
  }

  async delete<T>(
    path: string,
    body?: Record<string, unknown>,
    query?: QueryParams,
  ): Promise<T> {
    return this.request<T>('DELETE', path, body, query);
  }
}
