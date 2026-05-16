"use client"

import * as React from "react"
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns"
import { id } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: {
  className?: string
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
}) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>("30days")

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value)
    const now = new Date()
    let range: DateRange | undefined

    switch (value) {
      case "today":
        range = { from: startOfDay(now), to: endOfDay(now) }
        break
      case "yesterday":
        const yesterday = subDays(now, 1)
        range = { from: startOfDay(yesterday), to: endOfDay(yesterday) }
        break
      case "7days":
        range = { from: startOfDay(subDays(now, 6)), to: endOfDay(now) }
        break
      case "30days":
        range = { from: startOfDay(subDays(now, 29)), to: endOfDay(now) }
        break
      case "45days":
        range = { from: startOfDay(subDays(now, 44)), to: endOfDay(now) }
        break
      case "60days":
        range = { from: startOfDay(subDays(now, 59)), to: endOfDay(now) }
        break
      case "90days":
        range = { from: startOfDay(subDays(now, 89)), to: endOfDay(now) }
        break
      case "6months":
        range = { from: startOfDay(subMonths(now, 6)), to: endOfDay(now) }
        break
      case "1year":
        range = { from: startOfDay(subYears(now, 1)), to: endOfDay(now) }
        break
      case "custom":
        // Don't update range automatically for custom
        return
    }

    if (range) {
      setDate(range)
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[140px] bg-card">
          <SelectValue placeholder="Pilih Rentang" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hari Ini</SelectItem>
          <SelectItem value="yesterday">Kemarin</SelectItem>
          <SelectItem value="7days">7 Hari</SelectItem>
          <SelectItem value="30days">30 Hari</SelectItem>
          <SelectItem value="45days">45 Hari</SelectItem>
          <SelectItem value="60days">60 Hari</SelectItem>
          <SelectItem value="90days">90 Hari</SelectItem>
          <SelectItem value="6months">6 Bulan</SelectItem>
          <SelectItem value="1year">1 Tahun</SelectItem>
          <SelectItem value="custom">Rentang Kustom</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal bg-card",
              !date && "text-muted-foreground"
            )}
            onClick={() => {
              if (selectedPreset !== "custom") {
                setSelectedPreset("custom")
              }
            }}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd MMM yyyy", { locale: id })} -{" "}
                  {format(date.to, "dd MMM yyyy", { locale: id })}
                </>
              ) : (
                format(date.from, "dd MMM yyyy", { locale: id })
              )
            ) : (
              <span>Pilih tanggal</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => {
              setDate(newDate)
              if (selectedPreset !== "custom") {
                setSelectedPreset("custom")
              }
            }}
            numberOfMonths={2}
            locale={id}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
