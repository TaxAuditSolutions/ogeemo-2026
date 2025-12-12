// This API route is no longer needed as the download logic is now handled
// by a server action that generates a signed URL.
// The file is kept to avoid breaking changes if it was bookmarked,
// but it will simply return an error.

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return new NextResponse(
    JSON.stringify({ message: 'This API route is deprecated. Please use the new file download flow.' }),
    { status: 410, headers: { 'Content-Type': 'application/json' } }
  );
}
