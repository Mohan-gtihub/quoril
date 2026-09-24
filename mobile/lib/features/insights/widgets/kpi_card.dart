import 'package:flutter/cupertino.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/editorial.dart';
import 'charts.dart';

/// A KPI tile: big numeral + footnote label + colored delta chip.
///
/// Two layouts:
///  - compact (default) — a square-ish grid tile.
///  - [hero] — a full-width tile that promotes ONE primary metric, with an
///    optional [sparkline] mini-trend on the trailing edge.
class KpiCard extends StatelessWidget {
  const KpiCard({
    super.key,
    required this.value,
    required this.label,
    required this.delta,
    this.deltaUp = true,
    this.valueColor,
    this.accent,
    this.icon,
    this.hero = false,
    this.sparkline,
    this.sparkGradient,
  });

  final String value;
  final String label;
  final String delta;
  final bool deltaUp;
  final Color? valueColor;

  /// Section accent for the hero eyebrow label (defaults to neutral). Spend it
  /// only on the ONE promoted [hero] metric per screen.
  final Color? accent;
  final IconData? icon;

  /// Full-width promoted layout.
  final bool hero;

  /// Optional mini-trend values (minutes) rendered as a sparkline in [hero].
  final List<int>? sparkline;

  /// Optional accent-family gradient for the sparkline stroke.
  final List<Color>? sparkGradient;

  @override
  Widget build(BuildContext context) {
    final vColor = (valueColor ?? QColors.label).resolveFrom(context);
    // Leading glyph stays quiet (secondary) unless a semantic value color is
    // set — then the glyph echoes it. Ember is reserved for the hero focal.
    final iconColor = (valueColor ?? QColors.labelTertiary).resolveFrom(context);

    // Trend is a semantic signal (green good / red bad) via QChip — never ember,
    // so the ember hero value stays the single focal point.
    final trendChip = QChip(
      icon: deltaUp
          ? CupertinoIcons.arrow_up_right
          : CupertinoIcons.arrow_down_right,
      label: delta,
      color: deltaUp ? QColors.wellbeing : QColors.danger,
    );

    if (hero) {
      final eyebrow = accent == null
          ? QSectionHeader(label: label, padding: EdgeInsets.zero)
          : Text(
              label.toUpperCase(),
              style: QType.eyebrow.copyWith(color: accent!.resolveFrom(context)),
            );
      return QCard(
        padding: const EdgeInsets.all(QSpace.lg),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  eyebrow,
                  const SizedBox(height: QSpace.xs),
                  Text(
                    value,
                    style: QType.hero.copyWith(
                      color: vColor,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: QSpace.sm),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: trendChip,
                  ),
                ],
              ),
            ),
            if (sparkline != null) ...[
              const SizedBox(width: QSpace.md),
              SizedBox(
                width: 100,
                height: 56,
                child: TrendLineChart(
                  values: sparkline!,
                  color: (valueColor ?? QColors.brand).resolveFrom(context),
                  gradient: sparkGradient,
                  labels: const ['', '', '', '', '', '', ''],
                  semanticsLabel: '$label 7-day sparkline.',
                ),
              ),
            ],
          ],
        ),
      );
    }

    return QCard(
      padding: const EdgeInsets.all(QSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 14, color: iconColor),
                const SizedBox(width: 5),
              ],
              Expanded(
                child: Text(
                  label,
                  style: QType.meta,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: QSpace.xs),
          Text(
            value,
            style: QType.title1.copyWith(
              color: vColor,
              letterSpacing: -0.5,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: QSpace.xs),
          Align(alignment: Alignment.centerLeft, child: trendChip),
        ],
      ),
    );
  }
}

/// Distinct KPI treatment for the top-distraction app: an app icon + name
/// (NOT a title1 numeral), so it reads as an app, not a metric.
class DistractionKpiCard extends StatelessWidget {
  const DistractionKpiCard({
    super.key,
    required this.appName,
    required this.appIcon,
    required this.detail,
  });

  final String appName;
  final IconData appIcon;
  final String detail;

  @override
  Widget build(BuildContext context) {
    final danger = QColors.danger.resolveFrom(context);
    return QCard(
      padding: const EdgeInsets.all(QSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(CupertinoIcons.exclamationmark_triangle,
                  size: 14, color: danger),
              const SizedBox(width: 5),
              Expanded(
                child: Text('Top Distraction',
                    style: QType.meta,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          const SizedBox(height: QSpace.xs),
          Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: danger.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(appIcon, size: 17, color: danger),
              ),
              const SizedBox(width: QSpace.xs),
              Expanded(
                child: Text(
                  appName,
                  style: QType.title3Emphasized.copyWith(letterSpacing: -0.3),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            detail,
            style: QType.caption.copyWith(
              color: danger,
              fontWeight: FontWeight.w600,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
