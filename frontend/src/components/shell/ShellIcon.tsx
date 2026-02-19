import type { SVGProps } from "react";

type IconName =
  | "home"
  | "building"
  | "users"
  | "user"
  | "search"
  | "card"
  | "coach"
  | "line"
  | "pulse"
  | "bell"
  | "database"
  | "settings"
  | "wrench"
  | "flask"
  | "brain"
  | "pin"
  | "shield"
  | "gauge"
  | "activity"
  | "chart"
  | "menu"
  | "chevronDown";

const paths: Record<IconName, string[]> = {
  home: ["M3 10.5 12 3l9 7.5", "M5 9.5V21h14V9.5"],
  building: ["M4 21V5l8-2v18", "M12 9h8v12", "M8 7h.01", "M8 11h.01", "M8 15h.01", "M16 13h.01", "M16 17h.01"],
  users: ["M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M8 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M2 21a6 6 0 0 1 12 0", "M12 21a6 6 0 0 1 10 0"],
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4 21a8 8 0 0 1 16 0"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "m21 21-4.3-4.3"],
  card: ["M3 7h18", "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"],
  coach: ["M4 21h16", "M12 4v17", "M5 9h14", "M8 4h8"],
  line: ["M4 19l5-5 4 3 7-9"],
  pulse: ["M3 12h4l2 5 4-10 2 5h6"],
  bell: ["M18 8a6 6 0 1 0-12 0c0 7-3 6-3 8h18c0-2-3-1-3-8", "M10 20a2 2 0 0 0 4 0"],
  database: ["M12 4c-4.4 0-8 1.3-8 3s3.6 3 8 3 8-1.3 8-3-3.6-3-8-3Z", "M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7", "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"],
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2H8a1 1 0 0 0 .6-.9V3a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1V8c0 .4.2.8.6.9H21a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.9.6Z"],
  wrench: ["M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.7-2.7 2-2.6Z"],
  flask: ["M10 3v5l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-9V3", "M8 14h8"],
  brain: ["M8 7a3 3 0 0 1 6 0v10a3 3 0 0 1-6 0", "M10 5a3 3 0 1 1 6 2", "M8 13H6a3 3 0 1 1 0-6h2", "M14 13h2a3 3 0 1 0 0-6h-2"],
  pin: ["M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z", "M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  shield: ["M12 3 5 6v6c0 5 3.4 8.7 7 9 3.6-.3 7-4 7-9V6l-7-3Z"],
  gauge: ["M3 13a9 9 0 1 1 18 0", "M12 13l4-4", "M12 13v5"],
  activity: ["M3 12h4l2 5 4-10 2 5h6"],
  chart: ["M4 19V5", "M10 19v-8", "M16 19v-4", "M22 19V9"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  chevronDown: ["m6 9 6 6 6-6"],
};

export function ShellIcon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name].map((d, index) => <path key={`${name}-${index}`} d={d} />)}
    </svg>
  );
}
