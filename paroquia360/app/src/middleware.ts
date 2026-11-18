import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export const middleware = (request: NextRequest) => updateSession(request);
export const config = { runtime: 'nodejs', matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)'] };
