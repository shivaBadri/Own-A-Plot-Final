import Link from "next/link";

/**
 * Root 404 — catches paths outside the (public) route group, e.g. a bad /admin
 * URL. Kept in the same visual language rather than falling back to the Next.js
 * default page.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center bg-cream">
      <div className="container-page">
        <p className="eyebrow">404</p>
        <h1 className="mt-6 max-w-3xl font-serif text-h1 leading-[1.05]">
          A quiet corner that is not there.
        </h1>
        <p className="prose-max mt-8 text-body text-muted">
          The page you were looking for has moved or never existed.
        </p>
        <Link href="/" className="btn-luxury mt-12">
          Return Home
        </Link>
      </div>
    </div>
  );
}
