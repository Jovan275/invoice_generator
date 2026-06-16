"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Input } from "@/components/ui/input"

type ClientsSearchProps = {
  defaultValue?: string
}

export function ClientsSearch({ defaultValue = "" }: ClientsSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmed = value.trim()
      const currentQuery = searchParams.get("q")?.trim() ?? ""

      if (trimmed === currentQuery) {
        return
      }

      const params = new URLSearchParams(searchParams.toString())

      if (trimmed) {
        params.set("q", trimmed)
      } else {
        params.delete("q")
      }

      params.delete("page")

      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname)
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [value, pathname, router, searchParams])

  return (
    <Input
      type="search"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="Search by name, company, or email..."
      className="max-w-md"
      aria-label="Search clients"
    />
  )
}
