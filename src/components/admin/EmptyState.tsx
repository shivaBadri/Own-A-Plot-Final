import Link from "next/link";

export default function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="border border-charcoal/10 bg-sand/15 px-8 py-20 text-center">
      <p className="font-serif text-h3">{title}</p>
      <p className="prose-max mx-auto mt-4 text-admin-body text-muted">{body}</p>
      {action && (
        <Link href={action.href} className="btn-admin mt-8">
          {action.label}
        </Link>
      )}
    </div>
  );
}
