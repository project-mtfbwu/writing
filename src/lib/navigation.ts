export const PRIMARY_NAV = [
  { label: "Home", href: "/" },
  { label: "Read", href: "/read" },
  { label: "Learn", href: "/learn" },
  { label: "Atlas", href: "/atlas" },
  { label: "Write", href: "/projects" },
  { label: "Test", href: "/test" },
  { label: "Reference", href: "/reference" },
] as const;

export type PrimaryNavItem = (typeof PRIMARY_NAV)[number];
