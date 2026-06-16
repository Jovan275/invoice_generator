import { AuthFooterLink } from "@/app/(auth)/layout"
import { RegisterForm } from "@/components/auth/auth-forms"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { redirectIfAuthenticated } from "@/lib/auth/session"

export default async function RegisterPage() {
  await redirectIfAuthenticated()
  return (
    <Card className="border-0 shadow-none lg:border lg:shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>
          Start sending invoices in minutes. No email confirmation required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RegisterForm />

        <AuthFooterLink
          prompt="Already have an account?"
          href="/login"
          label="Sign in"
        />
      </CardContent>
    </Card>
  )
}
