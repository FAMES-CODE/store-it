"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { signIn } from "next-auth/react"

type AuthFormProps = { mode: "login" | "register" }

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const isRegister = mode === "register"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setPending(true)
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") ?? "")
    const password = String(form.get("password") ?? "")

    try {
      if (isRegister) {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.get("name"), email, password }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
      if (result?.error) throw new Error("Incorrect email or password.")
      router.push("/dashboard")
      router.refresh()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Something went wrong."
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 p-6">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <p className="mb-2 text-sm font-medium text-primary">Store it</p>
        <h1 className="text-2xl font-semibold">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isRegister
            ? "Start organizing your files in seconds."
            : "Sign in to access your storage."}
        </p>
        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="grid gap-1.5 text-sm font-medium">
              Name
              <input
                required
                name="name"
                minLength={2}
                className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          )}
          <label className="grid gap-1.5 text-sm font-medium">
            Email
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Password
            <input
              required
              name="password"
              type="password"
              minLength={8}
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <button
            disabled={pending}
            className="h-10 w-full rounded-md bg-primary font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {pending
              ? "Please wait…"
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <Link
            className="font-medium text-primary hover:underline"
            href={isRegister ? "/login" : "/register"}
          >
            {isRegister ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </section>
    </main>
  )
}
