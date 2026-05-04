import { format } from "date-fns";
import { id } from "date-fns/locale";
import { DateRange, PresetRange } from "@/types/dashboard";

export const getDateRangeForPreset = (preset: PresetRange): DateRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "7days":
      return {
        from: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 7,
        ),
        to: today,
      };
    case "30days":
      return {
        from: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 30,
        ),
        to: today,
      };
    case "90days":
      return {
        from: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 90,
        ),
        to: today,
      };
    case "thisMonth":
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: today,
      };
    case "lastMonth":
      return {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: new Date(today.getFullYear(), today.getMonth(), 0),
      };
    case "custom":
      return { from: undefined, to: undefined };
    default:
      return { from: undefined, to: undefined };
  }
};

export const formatDateRange = (dateRange: DateRange): string => {
  if (!dateRange.from && !dateRange.to) return "All time";
  if (dateRange.from && !dateRange.to) {
    return `From ${format(dateRange.from, "dd MMM yyyy", { locale: id })}`;
  }
  if (!dateRange.from && dateRange.to) {
    return `Until ${format(dateRange.to, "dd MMM yyyy", { locale: id })}`;
  }
  if (dateRange.from && dateRange.to) {
    return `${format(dateRange.from, "dd MMM yyyy", { locale: id })} - ${format(dateRange.to, "dd MMM yyyy", { locale: id })}`;
  }
  return "Select date range";
};

export const getPresetLabel = (preset: PresetRange): string => {
  switch (preset) {
    case "7days":
      return "Last 7 days";
    case "30days":
      return "Last 30 days";
    case "90days":
      return "Last 90 days";
    case "thisMonth":
      return "This month";
    case "lastMonth":
      return "Last month";
    case "custom":
      return "Custom range";
    default:
      return "Select period";
  }
};
