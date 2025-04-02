import { NextResponse, NextRequest } from 'next/server';

// Simple in-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();

// Clear old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimit.entries()) {
    if (now - value.timestamp > 3600000) {
      rateLimit.delete(key);
    }
  }
}, 3600000);

export function withRateLimit(handler: Function) {
  return async (request: NextRequest) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 60; // 60 requests per minute

    const current = rateLimit.get(ip) || { count: 0, timestamp: now };

    // Reset if outside window
    if (now - current.timestamp > windowMs) {
      current.count = 0;
      current.timestamp = now;
    }

    if (current.count >= maxRequests) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    current.count++;
    rateLimit.set(ip, current);

    return handler(request);
  };
}
