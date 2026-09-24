import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/primary_button.dart';
import 'settings_widgets.dart';

/// E8 — Paywall (large sheet). Built top-to-bottom as a persuasion narrative:
/// ember hero → benefit rows → plan selector → sticky, plan-bound CTA →
/// comparison table below the fold.
Future<void> showPaywallSheet(BuildContext context) {
  return showCupertinoModalPopup<void>(
    context: context,
    builder: (_) => const _PaywallSheet(),
  );
}

enum _Plan { monthly, annual, lifetime }

class _PaywallSheet extends StatefulWidget {
  const _PaywallSheet();

  @override
  State<_PaywallSheet> createState() => _PaywallSheetState();
}

class _PaywallSheetState extends State<_PaywallSheet> {
  _Plan _plan = _Plan.annual;

  static const _benefits = <(IconData, String, String)>[
    (
      CupertinoIcons.infinite,
      'Unlimited watched apps',
      'Guard every distraction, not just three.'
    ),
    (
      CupertinoIcons.chart_bar_alt_fill,
      'Advanced focus insights',
      'See exactly where your attention goes.'
    ),
    (
      CupertinoIcons.clock_fill,
      'Full session history',
      'Keep every session forever — not 7 days.'
    ),
    (
      CupertinoIcons.cloud_fill,
      'Cloud sync & custom nudges',
      'Your rules, on every device.'
    ),
  ];

  static const _features = <(String, Object, Object)>[
    ('Watched apps', 'Up to 3', 'Unlimited'),
    ('Focus insights', 'Basic', 'Advanced'),
    ('Session history', '7 days', 'Forever'),
    ('Cloud sync', false, true),
    ('Custom nudges', false, true),
  ];

  /// The CTA copy + price, bound to the selected plan.
  ({String label, String price}) get _cta => switch (_plan) {
        _Plan.monthly => (label: 'Start Free Trial', price: '\$4.99/mo'),
        _Plan.annual => (label: 'Start Free Trial', price: '\$29.99/yr'),
        _Plan.lifetime => (label: 'Get Pro', price: '\$79.99 once'),
      };

  @override
  Widget build(BuildContext context) {
    final brand = QColors.brand.resolveFrom(context);
    final cta = _cta;
    return SettingsSheet(
      heightFactor: 0.94,
      child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(
                    QSpace.md, QSpace.xs, QSpace.md, QSpace.md),
                children: [
                  const _Hero(),
                  const SizedBox(height: QSpace.xl),
                  // Benefit rows — lead with value, not a table.
                  for (final b in _benefits) ...[
                    _BenefitRow(icon: b.$1, title: b.$2, subtitle: b.$3),
                    const SizedBox(height: QSpace.md),
                  ],
                  const SizedBox(height: QSpace.xs),
                  // Plan selector.
                  _PlanTile(
                    title: 'Annual',
                    price: '\$29.99 / yr',
                    perMonth: '\$2.50/mo, billed annually',
                    ribbon: 'SAVE 50%',
                    selected: _plan == _Plan.annual,
                    onTap: () => _select(_Plan.annual),
                  ),
                  const SizedBox(height: QSpace.sm),
                  _PlanTile(
                    title: 'Monthly',
                    price: '\$4.99 / mo',
                    selected: _plan == _Plan.monthly,
                    onTap: () => _select(_Plan.monthly),
                  ),
                  const SizedBox(height: QSpace.sm),
                  _PlanTile(
                    title: 'Lifetime',
                    price: '\$79.99 once',
                    perMonth: 'One payment, yours forever',
                    selected: _plan == _Plan.lifetime,
                    onTap: () => _select(_Plan.lifetime),
                  ),
                  const SizedBox(height: QSpace.xl),
                  // Comparison table — below the fold, for the detail-seekers.
                  Text('Compare plans', style: QType.eyebrow),
                  const SizedBox(height: QSpace.sm),
                  _ComparisonTable(features: _features),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                    QSpace.md, QSpace.xs, QSpace.md, QSpace.xs),
                child: Column(
                  children: [
                    PrimaryButton(
                      label: '${cta.label} — ${cta.price}',
                      icon: CupertinoIcons.star_fill,
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        Navigator.pop(context);
                      },
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CupertinoButton(
                          onPressed: () {
                            HapticFeedback.selectionClick();
                            Navigator.pop(context);
                          },
                          child: Text('Not now', style: QType.footnote),
                        ),
                        Container(
                            width: 0.5,
                            height: 16,
                            color: QColors.separator.resolveFrom(context)),
                        CupertinoButton(
                          onPressed: () {
                            HapticFeedback.selectionClick();
                            Navigator.pop(context);
                          },
                          child: Text('Restore purchases',
                              style: QType.footnote.copyWith(color: brand)),
                        ),
                      ],
                    ),
                    Text(
                      'Payment is charged to your Apple ID. Subscriptions auto-renew unless cancelled. Terms & Privacy apply.',
                      style: QType.caption,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
    );
  }

  void _select(_Plan p) {
    HapticFeedback.selectionClick();
    setState(() => _plan = p);
  }
}

/// Warm ember-gradient hero card with a one-line value prop.
class _Hero extends StatelessWidget {
  const _Hero();

  @override
  Widget build(BuildContext context) {
    const onWarm = CupertinoColors.white;
    return Container(
      padding: const EdgeInsets.all(QSpace.lg),
      decoration: BoxDecoration(
        gradient: QGradients.warm,
        borderRadius: BorderRadius.circular(QRadius.glass),
        boxShadow: QElevation.brandGlow(context),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: onWarm.withValues(alpha: 0.22),
                  border: Border.all(
                      color: onWarm.withValues(alpha: 0.5), width: 1.5),
                ),
                child: const Icon(CupertinoIcons.star_fill,
                    color: onWarm, size: 22),
              ),
              const SizedBox(width: QSpace.sm),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: QSpace.sm, vertical: 3),
                decoration: BoxDecoration(
                  color: onWarm.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(QRadius.capsule),
                ),
                child: Text('7-DAY FREE TRIAL',
                    style: QType.caption2.copyWith(
                        color: onWarm,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6)),
              ),
            ],
          ),
          const SizedBox(height: QSpace.md),
          Text('Quoril Pro',
              style: QType.largeTitle.copyWith(color: onWarm)),
          const SizedBox(height: QSpace.xxs),
          Text('Do your best work, distraction-free.',
              style: QType.body.copyWith(color: onWarm.withValues(alpha: 0.9))),
        ],
      ),
    );
  }
}

class _BenefitRow extends StatelessWidget {
  const _BenefitRow(
      {required this.icon, required this.title, required this.subtitle});
  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        QIconTile(icon: icon, color: QColors.brand, size: 34),
        const SizedBox(width: QSpace.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: QType.headline),
              const SizedBox(height: 1),
              Text(subtitle, style: QType.footnote),
            ],
          ),
        ),
      ],
    );
  }
}

class _PlanTile extends StatelessWidget {
  const _PlanTile({
    required this.title,
    required this.price,
    this.perMonth,
    this.ribbon,
    required this.selected,
    required this.onTap,
  });
  final String title;
  final String price;
  final String? perMonth;
  final String? ribbon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final brand = QColors.brand.resolveFrom(context);
    // Frosted content tile. The selected state paints a 2px brand ring OUTSIDE
    // the frosted material so the accent selection still reads clearly; the
    // press feedback stays on [Pressable], so GlassCard is non-interactive.
    return Pressable(
      onTap: onTap,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(QRadius.card),
          border: selected ? Border.all(color: brand, width: 2) : null,
        ),
        child: GlassCard(
          interactive: false,
          tint: QColors.brand,
          padding: const EdgeInsets.all(QSpace.md),
          child: Row(
          children: [
            Icon(
              selected
                  ? CupertinoIcons.checkmark_circle_fill
                  : CupertinoIcons.circle,
              color: selected ? brand : QColors.labelTertiary.resolveFrom(context),
              size: 22,
            ),
            const SizedBox(width: QSpace.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(title, style: QType.headline),
                      if (ribbon != null) ...[
                        const SizedBox(width: QSpace.xs),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: brand,
                            borderRadius: BorderRadius.circular(QRadius.chip),
                          ),
                          child: Text(ribbon!,
                              style: QType.caption2.copyWith(
                                  color: CupertinoColors.white,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.4)),
                        ),
                      ],
                    ],
                  ),
                  if (perMonth != null) ...[
                    const SizedBox(height: 1),
                    Text(perMonth!, style: QType.footnote),
                  ],
                ],
              ),
            ),
            const SizedBox(width: QSpace.xs),
            Text(price,
                style: QType.body.copyWith(
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                    fontFeatures: const [FontFeature.tabularFigures()])),
          ],
        ),
        ),
      ),
    );
  }
}

class _ComparisonTable extends StatelessWidget {
  const _ComparisonTable({required this.features});
  final List<(String, Object, Object)> features;

  Widget _cell(BuildContext context, Object v, {required bool pro}) {
    if (v is bool) {
      // Single brand tint for affirmative checks; Free positives muted.
      return Icon(
        v ? CupertinoIcons.checkmark_alt : CupertinoIcons.minus,
        size: 18,
        color: v
            ? (pro ? QColors.brand : QColors.labelTertiary).resolveFrom(context)
            : QColors.labelTertiary.resolveFrom(context),
      );
    }
    return Text(v.toString(),
        style: QType.footnote.copyWith(
            fontWeight: pro ? FontWeight.w600 : FontWeight.w400,
            color: pro
                ? QColors.label.resolveFrom(context)
                : QColors.labelSecondary.resolveFrom(context)),
        textAlign: TextAlign.center);
  }

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      tint: QColors.brand,
      padding: const EdgeInsets.symmetric(vertical: QSpace.xs),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: QSpace.md, vertical: QSpace.xs),
            child: Row(
              children: [
                const Expanded(flex: 3, child: SizedBox()),
                Expanded(
                    flex: 2,
                    child: Text('Free',
                        style:
                            QType.caption.copyWith(fontWeight: FontWeight.w600),
                        textAlign: TextAlign.center)),
                Expanded(
                    flex: 2,
                    child: Text('Pro',
                        style: QType.caption.copyWith(
                            fontWeight: FontWeight.w700,
                            color: QColors.brand.resolveFrom(context)),
                        textAlign: TextAlign.center)),
              ],
            ),
          ),
          for (final f in features)
            Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: QSpace.md, vertical: QSpace.sm),
              child: Row(
                children: [
                  Expanded(flex: 3, child: Text(f.$1, style: QType.subhead)),
                  Expanded(
                      flex: 2,
                      child: Center(child: _cell(context, f.$2, pro: false))),
                  Expanded(
                      flex: 2,
                      child: Center(child: _cell(context, f.$3, pro: true))),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
