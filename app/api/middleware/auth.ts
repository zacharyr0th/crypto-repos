import { NextResponse, NextRequest } from 'next/server';

export function withAdminAuth(handler: Function) {
  return async (request: NextRequest) => {
    const adminToken = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!adminToken || adminToken !== process.env.ADMIN_API_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handler(request);
  };
}
