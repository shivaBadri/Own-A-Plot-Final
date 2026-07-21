import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/permissions";

/**
 * Append-only audit trail.
 *
 * Design rule: a failed log write must NEVER fail the action it was recording.
 * If Postgres rejects the insert, the employee's venture still saved and they
 * still see success — the log is a record, not a gate. Failures go to stderr
 * so they show up in Vercel's logs rather than disappearing.
 */

export interface ActivityActor {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LogActivityInput {
  actor: ActivityActor | null;
  /** Dotted verb: "employee.create", "venture.publish", "auth.login". */
  action: string;
  /** Model touched: "Admin", "Project", "Plot", "Layout". */
  entity: string;
  entityId?: string | null;
  /** One human sentence — this is what the activity table renders. */
  summary: string;
  metadata?: Record<string, unknown> | null;
  /** Pass the incoming request so IP and user agent are captured. */
  request?: Request | null;
}

function clientIpFrom(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || null;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const headers = input.request?.headers;

    await prisma.activityLog.create({
      data: {
        actorId: input.actor?.id ?? null,
        // Denormalised so the entry stays readable after the employee is gone.
        actorName: input.actor?.name ?? "System",
        actorEmail: input.actor?.email ?? "system@internal",
        actorRole: input.actor?.role ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary,
        ip: headers ? clientIpFrom(headers) : null,
        userAgent: headers?.get("user-agent")?.slice(0, 500) ?? null,
        // Zod/plain objects are `Record<string, unknown>`, which Prisma's
        // `InputJsonValue` cannot express without a cast. The value is a plain
        // JSON object by construction at every call site.
        metadata: (input.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  } catch (error) {
    console.error("[activity] failed to write log entry:", error);
  }
}

/** Human labels for the dotted verbs, used by the activity table. */
export const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in",
  "auth.logout": "Signed out",
  "employee.create": "Created employee",
  "employee.update": "Updated employee",
  "employee.role_change": "Changed role",
  "employee.deactivate": "Deactivated employee",
  "employee.activate": "Reactivated employee",
  "employee.password_reset": "Reset password",
  "employee.delete": "Deleted employee",
  "profile.update": "Updated own profile",
  "profile.password_change": "Changed own password",
  "venture.create": "Created venture",
  "venture.update": "Updated venture",
  "venture.publish": "Published venture",
  "venture.unpublish": "Unpublished venture",
  "venture.delete": "Deleted venture",
  "plot.create": "Created plot",
  "plot.update": "Updated plot",
  "plot.delete": "Deleted plot",
  "layout.create": "Created layout",
  "layout.update": "Updated layout",
  "layout.publish": "Published layout",
  "layout.unpublish": "Unpublished layout",
  "layout.delete": "Deleted layout",
  "layout.polygon_save": "Saved plot boundaries",
  "enquiry.update": "Updated enquiry",
  "enquiry.delete": "Deleted enquiry",
  "cms.update": "Updated content",
  "settings.update": "Updated settings",
  "media.upload": "Uploaded media",
  "media.delete": "Deleted media",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
