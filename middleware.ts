import { NextResponse, type NextRequest } from "next/server";

/**
 * Gates every route (pages + API) behind HTTP Basic Auth using
 * CAM_USERNAME / CAM_PASSWORD. Runs on the Edge runtime, so it uses
 * atob() instead of Buffer and a manual constant-time compare instead
 * of node:crypto.
 */
export function middleware(request: NextRequest) {
  const username = process.env.CAM_USERNAME;
  const password = process.env.CAM_PASSWORD;

  if (!username || !password) {
    return new NextResponse(
      "Server misconfigured: CAM_USERNAME and CAM_PASSWORD must be set.",
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const encoded = authHeader.slice(6);
    let decoded = "";
    try {
      decoded = atob(encoded);
    } catch {
      decoded = "";
    }

    const separatorIndex = decoded.indexOf(":");
    const providedUser = separatorIndex === -1 ? decoded : decoded.slice(0, separatorIndex);
    const providedPass = separatorIndex === -1 ? "" : decoded.slice(separatorIndex + 1);

    if (safeCompare(providedUser, username) && safeCompare(providedPass, password)) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Private Camera", charset="UTF-8"',
    },
  });
}

function safeCompare(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < maxLen; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= charA ^ charB;
  }
  return mismatch === 0;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
