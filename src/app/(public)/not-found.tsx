import Link from "next/link";

export default function NotFound() {
  return (
    <section className="pt-40 md:pt-48">
      <div className="container-page section-y">
        <p className="eyebrow">404</p>
        <h1 className="mt-6 max-w-3xl font-serif text-h1 leading-[1.05]">
          A quiet corner that is not there.
        </h1>
        <p className="prose-max mt-8 text-body text-muted">
          The page you were looking for has moved, or the venture is not yet
          open to preview.
        </p>
        <Link href="/" className="btn-luxury mt-12">
          Return Home
        </Link>
      </div>
    </section>
  );
}
