/**
 * Middleware for handling CORS and rate limiting
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry>;
  private readonly cleanupInterval: number;
  private cleanupTimer: NodeJS.Timeout;
  private readonly MAX_ENTRIES = 10000; // Prevent memory leaks

  constructor() {
    this.store = new Map();
    this.cleanupInterval = 60000; // Clean up every minute
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  private cleanup() {
    const now = Date.now();

    // Remove expired entries
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }

    // If still too many entries, remove oldest
    if (this.store.size > this.MAX_ENTRIES) {
      const entries = Array.from(this.store.entries()).sort(
        (a, b) => a[1].resetTime - b[1].resetTime
      );

      const toDelete = entries.slice(0, entries.length - this.MAX_ENTRIES);
      toDelete.forEach(([key]) => this.store.delete(key));
    }
  }

  isRateLimited(
    key: string,
    limit: number,
    windowMs: number
  ): {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetTime) {
      // First request or window expired
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: now + windowMs,
      };
    }

    if (entry.count >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: entry.resetTime,
      };
    }

    // Increment counter
    entry.count++;
    return {
      success: true,
      limit,
      remaining: limit - entry.count,
      reset: entry.resetTime,
    };
  }
}

// Create a new rate limiter instance
const rateLimiter = new RateLimiter();

// CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// Rate limit configuration
const rateLimitConfig = {
  // Public API endpoints that need rate limiting
  publicEndpoints: ['/api/repositories', '/api/search', '/api/stats', '/api/contributors'],
  // Endpoints that don't need rate limiting
  excludedEndpoints: ['/api/health', '/_next', '/static'],
  // Rate limit tiers
  tiers: {
    default: {
      requests: 100,
      windowMs: 60000, // 60 seconds
    },
    authenticated: {
      requests: 1000,
      windowMs: 60000, // 60 seconds
    },
  },
};

// Helper function to get client identifier
function getClientIdentifier(request: NextRequest): string {
  // Try to get the real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  // Use the first available IP, or fallback to a default
  const ip = forwardedFor?.split(',')[0] || realIp || cfConnectingIp || 'unknown';

  return ip;
}

// Helper function to check if request is authenticated
function isAuthenticated(request: NextRequest): boolean {
  // Allow public access to repositories endpoint
  if (request.nextUrl.pathname.startsWith('/api/repositories')) {
    return true;
  }
  const authHeader = request.headers.get('authorization');
  return !!authHeader && authHeader.startsWith('Bearer ');
}

export async function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Check if the endpoint should be rate limited
  const path = request.nextUrl.pathname;
  const shouldRateLimit =
    rateLimitConfig.publicEndpoints.some((endpoint) => path.startsWith(endpoint)) &&
    !rateLimitConfig.excludedEndpoints.some((endpoint) => path.startsWith(endpoint));

  if (shouldRateLimit) {
    const clientId = getClientIdentifier(request);
    const isAuth = isAuthenticated(request);

    // Use different rate limits based on authentication
    const tier = isAuth ? 'authenticated' : 'default';
    const { requests, windowMs } = rateLimitConfig.tiers[tier];

    // Create a unique key for this client and endpoint
    const key = `${clientId}:${path}`;

    const { success, limit, reset, remaining } = rateLimiter.isRateLimited(key, requests, windowMs);

    // Add rate limit headers
    const headers = {
      ...corsHeaders,
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
      'X-RateLimit-Tier': tier,
    };

    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Create response with rate limit headers
    const response = NextResponse.next();
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // For non-rate-limited endpoints, just add CORS headers
  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
