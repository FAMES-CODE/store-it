import { redirect } from "next/navigation"

import { safeAuth } from "@/lib/auth"

export default async function Page() {
  redirect((await safeAuth()) ? "/dashboard" : "/login")
}
