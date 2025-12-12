
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// The middleware is no longer needed.
// Routing logic is now handled in the root page.tsx and AuthProvider.
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
