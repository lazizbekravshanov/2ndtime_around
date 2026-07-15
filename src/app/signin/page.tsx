import { Suspense } from "react";
import { signinModes } from "@/lib/signinModes";
import { SignInClient } from "./SignInClient";

export default function SignInPage() {
  const { emailEnabled, demoEnabled } = signinModes({
    emailServer: process.env.EMAIL_SERVER,
    nodeEnv: process.env.NODE_ENV,
    demoPassword: process.env.DEMO_PASSWORD,
  });
  return (
    <Suspense>
      <SignInClient emailEnabled={emailEnabled} demoEnabled={demoEnabled} />
    </Suspense>
  );
}
