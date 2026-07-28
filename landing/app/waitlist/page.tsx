import Link from "next/link";
import { Container } from "@/components/ui";
import Reveal from "@/components/Reveal";
import Waitlist from "@/components/Waitlist";
import { IconArrow } from "@/components/icons";

export const metadata = {
  title: "Get Quoril V1 free",
  description:
    "Join before launch and get Quoril V1 free. No card, no trial, and only one launch email.",
};

export default function WaitlistPage() {
  return (
    <main className="dotgrid bg-paper text-ink">
      <section className="pb-24 pt-[150px] sm:pb-32 sm:pt-[190px]">
        <Container>
          <Reveal className="mx-auto flex max-w-[680px] flex-col items-center text-center">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              V1 launch offer
            </span>
            <h1 className="mt-5 font-heading text-[clamp(38px,6vw,64px)] font-semibold leading-[1.03] tracking-[-0.04em] text-ink">
              Get Quoril V1 free.
            </h1>
            <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-ink-muted sm:text-[18px]">
              Enter your email. We will send your V1 access when it launches —
              and nothing else.
            </p>
            <div className="mt-9 w-full rounded-tile border border-line bg-surface p-5 shadow-lift sm:p-7">
              <Waitlist showIntro={false} />
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-line pt-5 text-[12.5px] font-medium text-ink-muted sm:gap-x-4 sm:text-[13px]">
                <span>V1 free</span>
                <span className="h-1 w-1 rounded-full bg-ink-faint" aria-hidden="true" />
                <span>No card</span>
                <span className="h-1 w-1 rounded-full bg-ink-faint" aria-hidden="true" />
                <span>One launch email</span>
              </div>
            </div>
            <Link
              href="/features"
              className="group mt-7 inline-flex items-center gap-2 text-[14px] font-medium text-ink-muted transition hover:text-ink"
            >
              See what is included
              <IconArrow className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
