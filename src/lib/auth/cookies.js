export function getSessionCookieOptions(isProduction) {
  return {
    useSecureCookies: false,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    },
    cookies: {
      session_token: {
        name: isProduction ? "__Host-better-auth.session_token" : "better-auth.session_token",
        attributes: {
          httpOnly: true,
          sameSite: "lax",
          secure: isProduction,
          path: "/",
        },
      },
    },
  };
}
