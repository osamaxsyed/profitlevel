import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/landing', '/onboarding', '/demo'])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()

  // If user is not authenticated and trying to access root, redirect to landing
  if (!userId && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/landing', request.url))
  }

  // Protect all other non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
