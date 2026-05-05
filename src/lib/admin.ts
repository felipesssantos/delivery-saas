import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function ensureAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  return session;
}
