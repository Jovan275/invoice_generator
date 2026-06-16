import Link from "next/link"

import { AuthFooterLink } from "@/app/(auth)/layout"
import {
  AuthAlert,
  LoginForm,
} from "@/components/auth/auth-forms"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { redirectIfAuthenticated } from "@/lib/auth/session"

type LoginPageProps = {
  searchParams: Promise<{
    registered?: string
    reset?: string
    error?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await redirectIfAuthenticated()
  const params = await searchParams

  return (
    <Card className="border-0 shadow-none lg:border lg:shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Enter your email and password to access your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {params.registered === "1" ? (
          <AuthAlert variant="success">
            Account created successfully. Please sign in to continue.
          </AuthAlert>
        ) : null}

        {params.reset === "1" ? (
          <AuthAlert variant="success">
            Password updated successfully. Please sign in with your new password.
          </AuthAlert>
        ) : null}

        {params.error === "auth" ? (
          <AuthAlert variant="error">
            Authentication failed. Please try again.
          </AuthAlert>
        ) : null}

        <LoginForm />

        <div className="flex items-center justify-between text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <AuthFooterLink
          prompt="Don't have an account?"
          href="/register"
          label="Create one"
        />
      </CardContent>
    </Card>
  )
}
