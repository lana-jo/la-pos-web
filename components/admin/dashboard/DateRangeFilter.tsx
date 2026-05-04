"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, TrendingUp as TrendingUpIcon } from "lucide-react";
import { DateRange, PresetRange } from "@/types/dashboard";
import { formatDateRange } from "@/lib/dashboard/dateUtils";
import { id } from "date-fns/locale";

interface DateRangeFilterProps {
  dateRange: DateRange;
  selectedPreset: PresetRange;
  onPresetChange: (preset: PresetRange) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export const DateRangeFilter = ({
  dateRange,
  selectedPreset,
  onPresetChange,
  onDateRangeChange,
}: DateRangeFilterProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePresetChange = (preset: PresetRange) => {
    onPresetChange(preset);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7days">Last 7 days</SelectItem>
          <SelectItem value="30days">Last 30 days</SelectItem>
          <SelectItem value="90days">Last 90 days</SelectItem>
          <SelectItem value="thisMonth">This month</SelectItem>
          <SelectItem value="lastMonth">Last month</SelectItem>
          {/* <SelectItem value="custom">Custom range</SelectItem> */}
        </SelectContent>
      </Select>

      {selectedPreset === "custom" && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-64 justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange(dateRange)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange as any}
              onSelect={onDateRangeChange as any}
              numberOfMonths={2}
              locale={id}
            />
          </PopoverContent>
        </Popover>
      )}

      {selectedPreset !== "custom" && (
        <div className="text-sm text-muted-foreground px-3 py-1 bg-muted rounded-md">
          {formatDateRange(dateRange)}
        </div>
      )}
    </div>
  );
};

interface AnalyticsOverviewProps {
  children: React.ReactNode;
}

export const AnalyticsOverview = ({ children }: AnalyticsOverviewProps) => (
  <div className="space-y-6 mb-8">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        <TrendingUpIcon className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Analytics Overview</h2>
      </div>
      {children}
    </div>
  </div>
);
