"use client"

import { cn } from "@/lib/utils"
import { getLocalTimeZone, today, CalendarDate } from "@internationalized/date"
import { ComponentProps, useContext } from "react"
import {
  CalendarCell as CalendarCellRac,
  CalendarGridBody as CalendarGridBodyRac,
  CalendarGridHeader as CalendarGridHeaderRac,
  CalendarGrid as CalendarGridRac,
  CalendarHeaderCell as CalendarHeaderCellRac,
  Calendar as CalendarRac,
  CalendarStateContext,
  RangeCalendarStateContext,
  RangeCalendar as RangeCalendarRac,
  composeRenderProps,
} from "react-aria-components"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

interface BaseCalendarProps {
  className?: string
  selected?: CalendarDate
  defaultMonth?: CalendarDate
  onSelect?: (date: CalendarDate | undefined) => void
  disabled?: (date: CalendarDate) => boolean
  initialFocus?: boolean
  minValue?: CalendarDate
  maxValue?: CalendarDate
}

type CalendarProps = ComponentProps<typeof CalendarRac> & BaseCalendarProps
type RangeCalendarProps = ComponentProps<typeof RangeCalendarRac> & BaseCalendarProps

const CalendarHeader = () => {
  const calState = useContext(CalendarStateContext)
  const rangeState = useContext(RangeCalendarStateContext)
  const state = calState ?? rangeState

  if (!state) return null

  const currentDate = state.visibleRange.start
  const currentMonth = currentDate.month
  const currentYear = currentDate.year

  const now = today(getLocalTimeZone())
  const yearStart = now.year - 100
  const yearEnd = now.year
  const years = Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i)

  return (
    <header className="flex w-full items-center justify-center gap-2 pb-1 px-1">
      <select
        value={currentMonth}
        onChange={(e) =>
          state.setFocusedDate(currentDate.set({ month: Number(e.target.value) }))
        }
        className="h-8 sm:h-7 min-w-[100px] sm:min-w-[120px] rounded-md border border-input bg-background px-2 sm:px-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/70 cursor-pointer"
      >
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>

      <select
        value={currentYear}
        onChange={(e) =>
          state.setFocusedDate(currentDate.set({ year: Number(e.target.value) }))
        }
        className="h-8 sm:h-7 min-w-[80px] sm:min-w-[90px] rounded-md border border-input bg-background px-2 sm:px-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/70 cursor-pointer"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </header>
  )
}

const CalendarGridComponent = ({ isRange = false }: { isRange?: boolean }) => {
  const now = today(getLocalTimeZone())

  return (
    <CalendarGridRac>
      <CalendarGridHeaderRac>
        {(day) => (
          <CalendarHeaderCellRac className="size-9 rounded-lg p-0 text-xs font-medium text-muted-foreground/80">
            {day}
          </CalendarHeaderCellRac>
        )}
      </CalendarGridHeaderRac>
      <CalendarGridBodyRac className="[&_td]:px-0">
        {(date) => (
          <CalendarCellRac
            date={date}
            className={cn(
              "relative flex size-9 items-center justify-center whitespace-nowrap rounded-lg border border-transparent p-0 text-sm font-normal text-foreground outline-offset-2 duration-150 [transition-property:color,background-color,border-radius,box-shadow] focus:outline-none data-[disabled]:pointer-events-none data-[unavailable]:pointer-events-none data-[focus-visible]:z-10 data-[hovered]:bg-accent data-[selected]:bg-primary data-[hovered]:text-foreground data-[selected]:text-primary-foreground data-[unavailable]:line-through data-[disabled]:opacity-30 data-[unavailable]:opacity-30 data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring/70",
              isRange && "data-[selected]:rounded-none data-[selection-end]:rounded-e-lg data-[selection-start]:rounded-s-lg data-[invalid]:bg-red-100 data-[selected]:bg-accent data-[selected]:text-foreground data-[invalid]:data-[selection-end]:[&:not([data-hover])]:bg-destructive data-[invalid]:data-[selection-start]:[&:not([data-hover])]:bg-destructive data-[selection-end]:[&:not([data-hover])]:bg-primary data-[selection-start]:[&:not([data-hover])]:bg-primary data-[invalid]:data-[selection-end]:[&:not([data-hover])]:text-destructive-foreground data-[invalid]:data-[selection-start]:[&:not([data-hover])]:text-destructive-foreground data-[selection-end]:[&:not([data-hover])]:text-primary-foreground data-[selection-start]:[&:not([data-hover])]:text-primary-foreground",
              date.compare(now) === 0 && cn("after:pointer-events-none after:absolute after:bottom-1 after:start-1/2 after:z-10 after:size-[3px] after:-translate-x-1/2 after:rounded-full after:bg-primary", isRange ? "data-[selection-end]:[&:not([data-hover])]:after:bg-background data-[selection-start]:[&:not([data-hover])]:after:bg-background" : "data-[selected]:after:bg-background"),
            )}
          />
        )}
      </CalendarGridBodyRac>
    </CalendarGridRac>
  )
}

const Calendar = ({ className, selected, defaultMonth, onSelect, disabled, minValue, maxValue, ...props }: CalendarProps) => {
  return (
    <CalendarRac
      {...props}
      value={selected}
      defaultValue={defaultMonth}
      onChange={onSelect}
      minValue={minValue}
      maxValue={maxValue}
      className={composeRenderProps(className, (className) =>
        cn("w-fit", className),
      )}
    >
      <CalendarHeader />
      <CalendarGridComponent />
    </CalendarRac>
  )
}

const RangeCalendar = ({ className, ...props }: RangeCalendarProps) => {
  return (
    <RangeCalendarRac
      {...props}
      className={composeRenderProps(className, (className) =>
        cn("w-fit", className),
      )}
    >
      <CalendarHeader />
      <CalendarGridComponent isRange />
    </RangeCalendarRac>
  )
}

export { Calendar, RangeCalendar }