import Link from "next/link";
import { Container } from "@/components/ui/Container";

const button = "inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-medium text-bg transition hover:opacity-90";

/** The 404 page body. next/link rather than the i18n Link, so it also renders outside the locale layout. */
export function NotFound() {
  return (
    <main id="content" className="py-32">
      <Container>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-fg-muted">404</p>
        <h1 className="font-display mt-5 text-[clamp(2rem,4.5vw,3.6rem)] font-medium leading-[1.02] tracking-[-0.03em]">Not found</h1>
        <p className="mt-4 max-w-md text-[17px] leading-[1.6] text-fg/80">That page does not exist, or it has moved. The work, the CV and the agent are all on the home page.</p>
        <div className="mt-8">
          <Link href="/" className={button}>
            Home
          </Link>
        </div>
      </Container>
    </main>
  );
}
