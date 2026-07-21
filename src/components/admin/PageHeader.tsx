import Link from "next/link";

/**
 * Shared page header for every admin screen — eyebrow, serif title, optional
 * action. Same rhythm as the public site's section headers, one density down.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className="flex flex-col gap-6 border-b border-charcoal/10 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 font-serif text-admin-h1">{title}</h1>
        {description && (
          <p className="prose-max mt-3 text-admin-body text-muted">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Link href={action.href} className="btn-admin-solid shrink-0">
          {action.label}
        </Link>
      )}
    </header>
  );
}
