/**
 * Which sign-in paths to show on /signin, derived from server env.
 * - emailEnabled: real magic-link sign-up can actually deliver — SMTP is
 *   configured, or we're not in production (dev console-logs the link).
 * - demoEnabled: the demo persona picker is turned on.
 */
export function signinModes(env: {
  emailServer?: string;
  nodeEnv?: string;
  demoPassword?: string;
}): { emailEnabled: boolean; demoEnabled: boolean } {
  return {
    emailEnabled: Boolean(env.emailServer) || env.nodeEnv !== "production",
    demoEnabled: Boolean(env.demoPassword),
  };
}
