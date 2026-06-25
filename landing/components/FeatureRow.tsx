import Reveal from "./Reveal";
import { Eyebrow } from "./ui";

/** Alternating text + visual row used across feature sub-pages. */
export default function FeatureRow({
  eyebrow,
  title,
  body,
  bullets,
  visual,
  flip = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
      <Reveal className={flip ? "md:order-2" : ""}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-4 font-heading text-[clamp(24px,3vw,34px)] font-semibold leading-[1.1] tracking-[-0.025em] text-ink">
          {title}
        </h3>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">{body}</p>
        {bullets && (
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[15px] text-ink">
                <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ink" />
                {b}
              </li>
            ))}
          </ul>
        )}
      </Reveal>
      <Reveal delay={0.08} className={flip ? "md:order-1" : ""}>
        <div className="rounded-tile border border-line bg-surface p-5 shadow-lift">
          {visual}
        </div>
      </Reveal>
    </div>
  );
}
