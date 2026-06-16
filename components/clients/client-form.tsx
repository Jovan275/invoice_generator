"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  createClient,
  updateClient,
} from "@/app/(app)/clients/actions"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  clientFormSchema,
  type ClientFormValues,
} from "@/lib/clients/schema"
import {
  toClientFormDefaults,
  type ClientListItem,
} from "@/lib/clients/types"

type ClientFormProps = {
  mode: "create" | "edit"
  client?: ClientListItem | null
}

export function ClientForm({ mode, client = null }: ClientFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: toClientFormDefaults(client),
  })

  async function onSubmit(values: ClientFormValues) {
    setIsPending(true)

    const result =
      mode === "create"
        ? await createClient(values)
        : await updateClient(client!.id, values)

    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(
      mode === "create" ? "Client added." : "Client updated."
    )
    router.push("/clients")
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    placeholder="Jane Doe"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="organization"
                    placeholder="Acme Studio"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="client@example.com"
                  required
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Required. Used when sending invoices to this client.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea
                  autoComplete="street-address"
                  placeholder="Street, city, postal code, country"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vat_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VAT ID</FormLabel>
              <FormControl>
                <Input placeholder="Optional tax ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormDescription>
          At least one of full name or company name is required.
        </FormDescription>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => router.push("/clients")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? mode === "create"
                ? "Adding..."
                : "Saving..."
              : mode === "create"
                ? "Add client"
                : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
