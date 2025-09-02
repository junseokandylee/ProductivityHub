import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth',
  '/help', 
  '/api/public',
  '/_next',
  '/favicon.ico',
  '/static',
  '/images'
];

// Routes that require specific roles
const ADMIN_ROUTES = [
  '/settings/users',
  '/settings/billing',
  '/settings/security'
];

const OWNER_ROUTES = [
  '/settings/tenant',
  '/settings/api-keys'
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

function requiresAdmin(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
}

function requiresOwner(pathname: string): boolean {
  return OWNER_ROUTES.some(route => pathname.startsWith(route));
}

function verifyJwtLightweight(token: string): { roles: string[], tenantId: string, userId: string } | null {
  try {
    // Simple JWT payload extraction without verification for middleware
    // Full verification happens on the backend
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    
    return {
      roles: payload.role ? [payload.role] : [],
      tenantId: payload.tenant_id || '',
      userId: payload.nameid || payload.sub || ''
    };
  } catch (error) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  
  // Get auth token from cookies
  const authToken = request.cookies.get('access_token')?.value;
  
  // Redirect to login if no token
  if (!authToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Verify token and get claims
  const claims = verifyJwtLightweight(authToken);
  if (!claims) {
    // Invalid token, clear cookie and redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('access_token');
    return response;
  }
  
  // Check role-based access
  const userRole = claims.roles[0]?.toLowerCase();
  
  if (requiresOwner(pathname) && userRole !== 'owner') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  if (requiresAdmin(pathname) && !['owner', 'admin'].includes(userRole)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  // Add user info to headers for downstream components
  const response = NextResponse.next();
  response.headers.set('x-user-id', claims.userId);
  response.headers.set('x-tenant-id', claims.tenantId);
  response.headers.set('x-user-roles', claims.roles.join(','));
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};