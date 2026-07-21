/**
 * The permission system.
 *
 * IMPORTANT: this file must stay free of `@/lib/db`, `bcryptjs` and
 * `next/headers`. Middleware runs on the Edge runtime and imports it directly
 * to decide route access before a request ever reaches Node.
 *
 * Shape: `resource:action`. A role resolves to a set of those strings; an
 * individual employee can then be granted or revoked single permissions
 * without inventing a new role for every exception. Revoke beats grant.
 */

export const RESOURCES = [
  "dashboard",
  "ventures",
  "plots",
  "layouts",
  "enquiries",
  "crm",
  "cms",
  "media",
  "employees",
  "settings",
  "reports",
  "analytics",
  "finance",
] as const;

export const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "publish",
  "export",
] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
export type Permission = `${Resource}:${Action}`;

export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES_EXECUTIVE"
  | "LAYOUT_DESIGNER"
  | "MARKETING"
  | "FINANCE"
  | "CUSTOMER_SUPPORT";

export const ROLES: readonly Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SALES_EXECUTIVE",
  "LAYOUT_DESIGNER",
  "MARKETING",
  "FINANCE",
  "CUSTOMER_SUPPORT",
];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SALES_EXECUTIVE: "Sales Executive",
  LAYOUT_DESIGNER: "Layout Designer",
  MARKETING: "Marketing",
  FINANCE: "Finance",
  CUSTOMER_SUPPORT: "Customer Support",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN:
    "Unrestricted. The only role that can delete employees or promote another Super Admin.",
  ADMIN:
    "Runs the site day to day. Everything except deleting employees and creating Super Admins.",
  SALES_EXECUTIVE:
    "Works the pipeline — enquiries, CRM, plot availability. Read-only on ventures.",
  LAYOUT_DESIGNER:
    "Draws and publishes interactive master layouts. No access to people, money, or settings.",
  MARKETING:
    "Owns site content, media and the published story. Can publish ventures.",
  FINANCE: "Pricing, booked value, financial reporting and exports.",
  CUSTOMER_SUPPORT:
    "Answers and updates enquiries. Cannot change pricing or publish anything.",
};

export const RESOURCE_LABELS: Record<Resource, string> = {
  dashboard: "Dashboard",
  ventures: "Ventures",
  plots: "Plots",
  layouts: "Layout Management",
  enquiries: "Enquiries",
  crm: "CRM",
  cms: "Content",
  media: "Media",
  employees: "Employees",
  settings: "Settings",
  reports: "Reports",
  analytics: "Analytics",
  finance: "Finance",
};

export const ACTION_LABELS: Record<Action, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  publish: "Publish",
  export: "Export",
};

/** Which actions are meaningful for each resource. Rendering the full 13x6
 * grid would offer nonsense like "publish an employee". */
export const RESOURCE_ACTIONS: Record<Resource, readonly Action[]> = {
  dashboard: ["view"],
  ventures: ["view", "create", "edit", "delete", "publish", "export"],
  plots: ["view", "create", "edit", "delete", "export"],
  layouts: ["view", "create", "edit", "delete", "publish"],
  enquiries: ["view", "create", "edit", "delete", "export"],
  crm: ["view", "create", "edit", "delete", "export"],
  cms: ["view", "edit", "publish"],
  media: ["view", "create", "edit", "delete"],
  employees: ["view", "create", "edit", "delete"],
  settings: ["view", "edit"],
  reports: ["view", "export"],
  analytics: ["view", "export"],
  finance: ["view", "edit", "export"],
};

/** Every permission that actually exists, in a stable order. */
export const ALL_PERMISSIONS: Permission[] = RESOURCES.flatMap((resource) =>
  RESOURCE_ACTIONS[resource].map(
    (action) => `${resource}:${action}` as Permission
  )
);

const ALL_PERMISSION_SET = new Set<string>(ALL_PERMISSIONS);

export function isPermission(value: string): value is Permission {
  return ALL_PERMISSION_SET.has(value);
}

function all(resource: Resource): Permission[] {
  return RESOURCE_ACTIONS[resource].map(
    (action) => `${resource}:${action}` as Permission
  );
}

function only(resource: Resource, ...actions: Action[]): Permission[] {
  return actions
    .filter((action) => RESOURCE_ACTIONS[resource].includes(action))
    .map((action) => `${resource}:${action}` as Permission);
}

/**
 * Role → default permissions.
 *
 * SUPER_ADMIN is deliberately NOT listed as a big array: it is handled as a
 * wildcard in `resolvePermissions`, so a resource added in a later stage is
 * automatically visible to the owner instead of silently locking them out
 * until someone remembers to update this table.
 */
const ROLE_PERMISSIONS: Record<Exclude<Role, "SUPER_ADMIN">, Permission[]> = {
  ADMIN: [
    ...all("dashboard"),
    ...all("ventures"),
    ...all("plots"),
    ...all("layouts"),
    ...all("enquiries"),
    ...all("crm"),
    ...all("cms"),
    ...all("media"),
    ...all("reports"),
    ...all("analytics"),
    ...all("finance"),
    ...all("settings"),
    // An Admin can build the team but cannot remove people — deletion of an
    // employee destroys an audit subject and stays with the Super Admin.
    ...only("employees", "view", "create", "edit"),
  ],

  SALES_EXECUTIVE: [
    ...only("dashboard", "view"),
    ...only("ventures", "view"),
    ...only("plots", "view", "edit", "export"),
    ...only("enquiries", "view", "create", "edit", "export"),
    ...only("crm", "view", "create", "edit", "export"),
    ...only("reports", "view"),
  ],

  /**
   * Exactly the surface the brief specifies: Dashboard, Ventures, Layout
   * Management, Preview, Logout.
   *
   * Note what is NOT here: `media:create` and `plots:view`. A designer still
   * has to upload a layout image and bind polygons to plots, so those two
   * capabilities are served THROUGH the layouts resource — the upload endpoint
   * accepts `layouts:edit`, and the layout editor reads its own plot list
   * under `layouts:view`. That keeps the navigation exactly as specified
   * without breaking the feature, and without handing out the media library.
   */
  LAYOUT_DESIGNER: [
    ...only("dashboard", "view"),
    ...only("ventures", "view"),
    ...all("layouts"),
  ],

  MARKETING: [
    ...only("dashboard", "view"),
    ...only("ventures", "view", "edit", "publish", "export"),
    ...only("plots", "view"),
    ...only("layouts", "view"),
    ...all("cms"),
    ...all("media"),
    ...only("enquiries", "view", "export"),
    ...only("analytics", "view", "export"),
    ...only("reports", "view", "export"),
  ],

  FINANCE: [
    ...only("dashboard", "view"),
    ...only("ventures", "view", "export"),
    ...only("plots", "view", "edit", "export"),
    ...all("finance"),
    ...only("reports", "view", "export"),
    ...only("analytics", "view", "export"),
    ...only("enquiries", "view", "export"),
  ],

  CUSTOMER_SUPPORT: [
    ...only("dashboard", "view"),
    ...only("ventures", "view"),
    ...only("plots", "view"),
    ...only("enquiries", "view", "create", "edit", "export"),
    ...only("crm", "view", "edit"),
    ...only("reports", "view"),
  ],
};

export function permissionsForRole(role: Role): Permission[] {
  if (role === "SUPER_ADMIN") return [...ALL_PERMISSIONS];
  return ROLE_PERMISSIONS[role] ?? [];
}

export interface PermissionSubject {
  role: Role;
  permissionGrants?: string[] | null;
  permissionRevokes?: string[] | null;
}

/**
 * Role defaults + explicit grants − explicit revocations.
 *
 * A Super Admin cannot be revoked down to nothing: the whole point of the role
 * is that there is always one account that can undo a mistake. Revocations are
 * ignored for it.
 */
export function resolvePermissions(subject: PermissionSubject): Set<Permission> {
  const resolved = new Set<Permission>(permissionsForRole(subject.role));

  if (subject.role === "SUPER_ADMIN") return resolved;

  for (const grant of subject.permissionGrants ?? []) {
    if (isPermission(grant)) resolved.add(grant);
  }
  for (const revoke of subject.permissionRevokes ?? []) {
    if (isPermission(revoke)) resolved.delete(revoke);
  }

  return resolved;
}

export function hasPermission(
  subject: PermissionSubject,
  permission: Permission
): boolean {
  if (subject.role === "SUPER_ADMIN") return true;
  return resolvePermissions(subject).has(permission);
}

export function hasAnyPermission(
  subject: PermissionSubject,
  permissions: readonly Permission[]
): boolean {
  if (subject.role === "SUPER_ADMIN") return true;
  const resolved = resolvePermissions(subject);
  return permissions.some((permission) => resolved.has(permission));
}

export function canAccessResource(
  subject: PermissionSubject,
  resource: Resource
): boolean {
  return hasPermission(subject, `${resource}:view` as Permission);
}

/**
 * Admin route → the permission required to open it.
 *
 * Ordered longest-prefix-first so `/admin/employees/new` matches the employees
 * entry rather than falling through. Middleware and the server layout both
 * read this table, which is what stops the two from drifting apart.
 */
const ROUTE_PERMISSIONS: ReadonlyArray<readonly [string, Permission]> = [
  ["/admin/dashboard", "dashboard:view"],
  ["/admin/projects", "ventures:view"],
  ["/admin/ventures", "ventures:view"],
  ["/admin/layouts", "layouts:view"],
  ["/admin/plots", "plots:view"],
  ["/admin/enquiries", "enquiries:view"],
  ["/admin/crm", "crm:view"],
  ["/admin/cms", "cms:view"],
  ["/admin/media", "media:view"],
  ["/admin/employees", "employees:view"],
  ["/admin/activity", "employees:view"],
  ["/admin/settings", "settings:view"],
  ["/admin/reports", "reports:view"],
  ["/admin/analytics", "analytics:view"],
  ["/admin/finance", "finance:view"],
];

/** Reachable by any authenticated employee regardless of role. */
const OPEN_ADMIN_ROUTES = [
  "/admin/login",
  "/admin/profile",
  "/admin/no-access",
];

export function isOpenAdminRoute(pathname: string): boolean {
  return OPEN_ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/** `null` means "no specific permission gates this path". */
export function permissionForPath(pathname: string): Permission | null {
  const match = ROUTE_PERMISSIONS.filter(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  ).sort((a, b) => b[0].length - a[0].length)[0];

  return match ? match[1] : null;
}

/**
 * The first page an employee can actually open, used after login and whenever
 * someone is bounced off a page they cannot see. A Layout Designer landing on
 * a 403 because /admin/dashboard was hardcoded would be a bug, not a policy.
 */
export function landingPathFor(subject: PermissionSubject): string {
  const candidates: ReadonlyArray<readonly [Permission, string]> = [
    ["dashboard:view", "/admin/dashboard"],
    ["ventures:view", "/admin/projects"],
    ["layouts:view", "/admin/layouts"],
    ["enquiries:view", "/admin/enquiries"],
    ["plots:view", "/admin/plots"],
    ["cms:view", "/admin/cms"],
    ["media:view", "/admin/media"],
    ["employees:view", "/admin/employees"],
    ["settings:view", "/admin/settings"],
  ];

  const resolved = resolvePermissions(subject);
  const hit = candidates.find(([permission]) => resolved.has(permission));
  return hit ? hit[1] : "/admin/profile";
}
