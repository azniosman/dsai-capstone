import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';

interface TokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}

/**
 * Low-level HTTP client for SSG/WSG APIs.
 *
 * Handles:
 *  - OAuth2 Client Credentials token acquisition and caching
 *  - Automatic token refresh on 401
 *  - 10-second request timeout
 *  - Graceful degradation when credentials are not configured
 */
@Injectable()
export class SsgClientService implements OnModuleInit {
  private readonly logger = new Logger(SsgClientService.name);

  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;

  private tokenCache: TokenCache | null = null;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('SSG_CLIENT_ID');
    this.clientSecret = this.config.get<string>('SSG_CLIENT_SECRET');
    this.baseUrl =
      this.config.get<string>('SSG_API_BASE_URL') ??
      'https://uat-api.ssg-wsg.gov.sg';
    this.tokenUrl =
      this.config.get<string>('SSG_TOKEN_URL') ??
      `${this.baseUrl}/dp-oauth/oauth/token`;
  }

  onModuleInit() {
    if (!this.isConfigured()) {
      this.logger.warn(
        'SSG_CLIENT_ID / SSG_CLIENT_SECRET not set — SSG live calls disabled, will use cached/seeded fallback.',
      );
    }
  }

  /** Returns true when SSG credentials are present in env */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  // ─── Token management ────────────────────────────────────────

  private async fetchToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
    }).toString();

    const raw = await this.httpRequest<{
      access_token: string;
      expires_in: number;
    }>(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body).toString(),
      },
      body,
    });

    this.tokenCache = {
      accessToken: raw.access_token,
      // Refresh 60 s before actual expiry
      expiresAt: Date.now() + (raw.expires_in - 60) * 1000,
    };

    return this.tokenCache.accessToken;
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.accessToken;
    }
    return this.fetchToken();
  }

  // ─── Public API calls ─────────────────────────────────────────

  /**
   * GET a SSG API endpoint with Bearer auth.
   * Retries once on 401 (stale token).
   */
  async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const token = await this.getToken();
    const qs = query ? '?' + new URLSearchParams(query).toString() : '';
    const url = `${this.baseUrl}${path}${qs}`;

    try {
      return await this.httpRequest<T>(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
    } catch (err: any) {
      if (err?.statusCode === 401) {
        // Force token refresh and retry once
        this.tokenCache = null;
        const freshToken = await this.getToken();
        return this.httpRequest<T>(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${freshToken}`,
            Accept: 'application/json',
          },
        });
      }
      throw err;
    }
  }

  // ─── Raw HTTP helper ──────────────────────────────────────────

  private httpRequest<T>(
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body?: string;
    },
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const lib = isHttps ? https : http;

      const req = lib.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method: options.method,
          headers: options.headers,
          timeout: 10_000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString();
            if (res.statusCode && res.statusCode >= 400) {
              const e: any = new Error(
                `SSG API ${res.statusCode}: ${raw.substring(0, 200)}`,
              );
              e.statusCode = res.statusCode;
              return reject(e);
            }
            try {
              resolve(JSON.parse(raw) as T);
            } catch {
              resolve(raw as unknown as T);
            }
          });
        },
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('SSG API request timed out after 10s'));
      });
      req.on('error', reject);

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }
}
