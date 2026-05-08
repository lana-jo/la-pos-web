"use client";

import { useThemeClass } from "./useTheme";

export function useSidebarTheme() {
  const mobileButton = useThemeClass(
    "bg-gradient-to-r from-white to-slate-50 border-slate-200/50",
    "bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600/50"
  );

  const sidebar = useThemeClass(
    "bg-gradient-to-br from-white via-slate-50 to-white border-r border-slate-200/50",
    "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50"
  );

  const header = useThemeClass(
    "border-slate-200/30 bg-white/90",
    "border-slate-700/50 bg-slate-800/80"
  );

  const title = useThemeClass("text-slate-900", "text-white");
  const subtitle = useThemeClass("text-slate-400", "text-slate-500");

  const collapseButton = useThemeClass(
    "hover:bg-slate-700",
    "hover:bg-slate-100"
  );

  const footer = useThemeClass(
    "border-slate-200/30 bg-white/80",
    "border-slate-700/50 bg-slate-800/70"
  );

  const profile = useThemeClass(
    "bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-blue-200/50 hover:from-blue-100 hover:via-indigo-100 hover:to-blue-100",
    "bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-blue-900/40 border-blue-700/50 hover:from-blue-900/50 hover:via-indigo-900/50 hover:to-blue-900/50"
  );

  const role = useThemeClass("text-blue-700/90", "text-blue-400/80");

  const separator = useThemeClass(
    "bg-gradient-to-r from-transparent via-slate-200/50 to-transparent",
    "bg-gradient-to-r from-transparent via-slate-700/50 to-transparent"
  );

  const themeButton = useThemeClass(
    "text-slate-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 hover:border hover:border-blue-300/30",
    "text-slate-400 hover:text-blue-300 hover:bg-gradient-to-r hover:from-slate-800 hover:to-slate-700 hover:border hover:border-blue-700/30"
  );

  const logoutButton = useThemeClass(
    "text-red-600 hover:text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:border hover:border-red-300/30",
    "text-red-400 hover:text-red-300 hover:bg-gradient-to-r hover:from-red-900/40 hover:to-pink-900/40 hover:border hover:border-red-700/30"
  );

  return {
    mobileButton,
    sidebar,
    header,
    title,
    subtitle,
    collapseButton,
    footer,
    profile,
    role,
    separator,
    themeButton,
    logoutButton,
  };
}
