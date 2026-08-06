"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar-rac"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { CalendarDate } from "@internationalized/date"

interface DatePickerProps {
  id?: string
  value?: CalendarDate
  onChange?: (date: CalendarDate | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minValue?: CalendarDate
  maxValue?: CalendarDate
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled,
  minValue,
  maxValue,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? value.toString() : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          selected={value}
          onSelect={(date) => {
            onChange?.(date)
            setOpen(false)
          }}
          minValue={minValue}
          maxValue={maxValue}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
