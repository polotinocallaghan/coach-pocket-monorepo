import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const authCookie = request.cookies.get('tf_auth_status')?.value;
    const path = request.nextUrl.pathname;

    const isAuthRoute = path.startsWith('/login') || path.startsWith('/signup');
    const isPublicRoute = path === '/' || isAuthRoute || path.startsWith('/_next') || path.startsWith('/api/');

    // Redirección si el usuario es anónimo y requiere ruta privada
    if (!authCookie && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Redirección si el usuario está logueado o es invitado pero intenta ir al login de nuevo
    if ((authCookie === 'authenticated' || authCookie === 'guest') && isAuthRoute) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    // Aplica el middleware en todas las rutas EXCEPTO en archivos estáticos / imágenes
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
