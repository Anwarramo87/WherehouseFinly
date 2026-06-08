import { redirect } from "next/navigation";

export default function Home() {
  // Root auth routing is handled centrally in proxy.ts.
  redirect("/login");
}
