import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/primary_button.dart';

/// E8 — Paywall (large sheet).
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

  static const _features = [
    ('Watched apps', 'Up to 3', 'Unlimited'),
    ('Focus insights', 'Basic', 'Advanced'),
    ('Session history', '7 days', 'Forever'),
    ('Cloud sync', false, true),
    ('Custom nudges', false, true),
  ];

  @override
  Widget build(BuildContext context) {
    final tint = QColors.breakColor.resolveFrom(context);
    return FractionallySizedBox(
      heightFactor: 0.92,
      child: Container(
        decoration: BoxDecoration(
          gradient: QGradients.page(MediaQuery.platformBrightnessOf(context)),
          borderRadius:
              const BorderRadius.vertical(top: Radius.circular(QRadius.glass)),
        ),
        child: Column(
          children: [
            Container(
              width: 36,
              height: 5,
              margin: const EdgeInsets.only(top: QSpace.sm, bottom: QSpace.xs),
              decoration: BoxDecoration(
                color: QColors.separator.resolveFrom(context),
                borderRadius: BorderRadius.circular(QRadius.capsule),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(
                    QSpace.lg, QSpace.md, QSpace.lg, QSpace.md),
                children: [
                  Center(
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: QGradients.warm,
                      ),
                      child: const Icon(CupertinoIcons.star_fill,
                          color: CupertinoColors.white, size: 32),
                    ),
                  ),
                  const SizedBox(height: QSpace.md),
                  Text('Quoril Pro',
                      style: QType.title1, textAlign: TextAlign.center),
                  const SizedBox(height: QSpace.xs),
                  Text('Do your best work, distraction-free.',
                      style: QType.subhead, textAlign: TextAlign.center),
                  const SizedBox(height: QSpace.xl),
                  _ComparisonTable(features: _features),
                  const SizedBox(height: QSpace.xl),
                  _PlanTile(
                    title: 'Monthly',
                    price: '\$4.99 / mo',
                    selected: _plan == _Plan.monthly,
                    onTap: () => _select(_Plan.monthly),
                  ),
                  const SizedBox(height: QSpace.sm),
                  _PlanTile(
                    title: 'Annual',
                    price: '\$29.99 / yr',
                    badge: 'Best value · save 50%',
                    selected: _plan == _Plan.annual,
                    onTap: () => _select(_Plan.annual),
                  ),
                  const SizedBox(height: QSpace.sm),
                  _PlanTile(
                    title: 'Lifetime',
                    price: '\$79.99 once',
                    selected: _plan == _Plan.lifetime,
                    onTap: () => _select(_Plan.lifetime),
                  ),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                    QSpace.lg, QSpace.xs, QSpace.lg, QSpace.xs),
                child: Column(
                  children: [
                    PrimaryButton(
                      label: 'Continue',
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        Navigator.pop(context);
                      },
                    ),
                    const SizedBox(height: QSpace.xs),
                    CupertinoButton(
                      onPressed: () {
                        HapticFeedback.selectionClick();
                        Navigator.pop(context);
                      },
                      child: Text('Restore Purchases',
                          style: QType.footnote
                              .copyWith(color: tint)),
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
      ),
    );
  }

  void _select(_Plan p) {
    HapticFeedback.selectionClick();
    setState(() => _plan = p);
  }
}

class _ComparisonTable extends StatelessWidget {
  const _ComparisonTable({required this.features});
  final List<(String, Object, Object)> features;

  Widget _cell(BuildContext context, Object v, {required bool pro}) {
    if (v is bool) {
      return Icon(
        v ? CupertinoIcons.checkmark_alt : CupertinoIcons.minus,
        size: 18,
        color: v
            ? (pro ? QColors.breakColor : QColors.wellbeing).resolveFrom(context)
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
    return Container(
      padding: const EdgeInsets.symmetric(vertical: QSpace.xs),
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.card),
      ),
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
                        style: QType.caption.copyWith(fontWeight: FontWeight.w600),
                        textAlign: TextAlign.center)),
                Expanded(
                    flex: 2,
                    child: Text('Pro',
                        style: QType.caption.copyWith(
                            fontWeight: FontWeight.w700,
                            color: QColors.breakColor.resolveFrom(context)),
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
                  Expanded(flex: 2, child: Center(child: _cell(context, f.$2, pro: false))),
                  Expanded(flex: 2, child: Center(child: _cell(context, f.$3, pro: true))),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _PlanTile extends StatelessWidget {
  const _PlanTile({
    required this.title,
    required this.price,
    this.badge,
    required this.selected,
    required this.onTap,
  });
  final String title;
  final String price;
  final String? badge;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tint = QColors.breakColor.resolveFrom(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(QSpace.md),
        decoration: BoxDecoration(
          color: QColors.surface.resolveFrom(context),
          borderRadius: BorderRadius.circular(QRadius.card),
          border: Border.all(
            color: selected ? tint : QColors.separator.resolveFrom(context),
            width: selected ? 2 : 0.5,
          ),
        ),
        child: Row(
          children: [
            Icon(
              selected
                  ? CupertinoIcons.checkmark_circle_fill
                  : CupertinoIcons.circle,
              color: selected
                  ? tint
                  : QColors.labelTertiary.resolveFrom(context),
              size: 22,
            ),
            const SizedBox(width: QSpace.sm),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: QType.headline),
                if (badge != null)
                  Text(badge!,
                      style: QType.caption.copyWith(
                          color: QColors.wellbeing.resolveFrom(context),
                          fontWeight: FontWeight.w600)),
              ],
            ),
            const Spacer(),
            Text(price, style: QType.body),
          ],
        ),
      ),
    );
  }
}
