/**
 * Google sign-in entry point.
 *
 * A plain link, not a button with a handler: starting the handshake is a
 * navigation to our own route, which then redirects to Google. That keeps it
 * working without JavaScript and needs no exception in the nonce CSP.
 *
 * The role rides in the query string so a brand-new account is created as the
 * right kind. An existing account ignores it — the role comes from the account.
 */
export function GoogleButton({
  role,
  label = "Continue with Google",
}: {
  role: "COMPANY" | "CONTRACTOR";
  label?: string;
}) {
  return (
    <a
      href={`/api/auth/google?role=${role}`}
      className="btn-secondary w-full"
      data-testid="google-signin"
    >
      {/* Google's mark, inlined — the CSP allows no external images, and a
          sign-in button that renders a broken icon reads as a phishing page. */}
      <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden>
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
        />
      </svg>
      {label}
    </a>
  );
}
