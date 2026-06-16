import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <div className="flex min-h-full flex-1">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="relative z-10">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground/80">
            Invoice Generator
          </p>
          <h1 className="mt-6 max-w-md text-4xl font-semibold tracking-tight">
            Get paid faster with professional invoices.
          </h1>
          <p className="mt-4 max-w-md text-base text-primary-foreground/85">
            Create, send, and track invoices in minutes. Built for freelancers
            who want less admin and more time for client work.
          </p>
        </div>

        <div className="relative z-10 space-y-3 text-sm text-primary-foreground/80">
          <p>Send PDF invoices with payment links.</p>
          <p>Track paid and outstanding invoices in one place.</p>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -bottom-16 size-72 rounded-full bg-primary-foreground/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-16 right-24 size-40 rounded-full bg-primary-foreground/10 blur-2xl"
        />
      </aside>

      <main className="flex w-full flex-1 items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 lg:hidden">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
              Invoice Generator
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

export function AuthFooterLink({
  prompt,
  href,
  label,
}: {
  prompt: string
  href: string
  label: string
}) {
  return (
    <p className="text-center text-sm text-muted-foreground">
      {prompt}{" "}
      <Link href={href} className="font-medium text-primary hover:underline">
        {label}
      </Link>
    </p>
  )
}
