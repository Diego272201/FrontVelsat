import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    if (
      req.nextUrl.pathname === "/trackvelnew/seguimientounidad" ||
      req.nextUrl.pathname.startsWith("/trackvelnew/geocercas")
    ) {
      return NextResponse.next();
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (
          req.nextUrl.pathname === "/trackvelnew/seguimientounidad" ||
          req.nextUrl.pathname.startsWith("/trackvelnew/geocercas")
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/trackvelnew/:path*"],
};