import Reveal from "./Reveal";
import { Container, Eyebrow, Button } from "./ui";

/** Standard hero used at the top of every sub-page. */
export default function PageHeader({
  eyebrow,
  title,
  sub,
  cta = true,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub: string;
  cta?: boolean;
}) {
  return (
    <header className="dotgrid border-b border-line">
      <Container className="pb-16 pt-[140px] text-center">
        <Reveal>
          <div className="mb-5 flex justify-center">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mx-auto max-w-[18ch] font-heading text-[clamp(34px,5.4vw,62px)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink">
            {title}
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-[600px] text-[clamp(15px,1.9vw,19px)] leading-relaxed text-ink-muted">
            {sub}
          </p>
        </Reveal>
        {cta && (
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button href="/waitlist">Join the waitlist</Button>
              <Button href="/features" variant="secondary">
                Explore features
              </Button>
            </div>
          </Reveal>
        )}
      </Container>
    </header>
  );
}
