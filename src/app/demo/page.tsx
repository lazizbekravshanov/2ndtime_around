import { redirect } from "next/navigation";

// The persona picker on /signin replaced the separate demo page; keep the
// old URL working since it's in shared links and the demo script.
export default function DemoRedirect() {
  redirect("/signin");
}
