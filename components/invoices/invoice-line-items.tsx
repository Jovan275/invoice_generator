"use client"

import { RiAddLine, RiDeleteBinLine } from "@remixicon/react"
import { useFieldArray, useFormContext } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  defaultLineItem,
  type InvoiceFormInput,
} from "@/lib/invoices/schema"

export function InvoiceLineItems() {
  const form = useFormContext<InvoiceFormInput>()
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "line_items",
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Line items</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(defaultLineItem())}
        >
          <RiAddLine className="size-4" />
          Add line
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-4 rounded-lg border p-4 md:grid-cols-12"
          >
            <FormField
              control={form.control}
              name={`line_items.${index}.description`}
              render={({ field: itemField }) => (
                <FormItem className="md:col-span-4">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Service or product" {...itemField} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`line_items.${index}.quantity`}
              render={({ field: itemField }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.001" {...itemField} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`line_items.${index}.unit_type`}
              render={({ field: itemField }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Unit</FormLabel>
                  <Select
                    onValueChange={itemField.onChange}
                    value={itemField.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`line_items.${index}.unit_price`}
              render={({ field: itemField }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" {...itemField} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`line_items.${index}.vat_rate`}
              render={({ field: itemField }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel>VAT %</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="100" step="0.001" {...itemField} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-end md:col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={fields.length <= 1}
                onClick={() => remove(index)}
                aria-label="Remove line item"
              >
                <RiDeleteBinLine className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
