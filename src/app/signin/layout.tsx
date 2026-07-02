import type { Metadata } from "next";

// The sign-in page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with your UC email to buy, sell, and donate on campus.",
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
