import 'package:flutter/cupertino.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/glass.dart';

/// A KPI tile: big numeral + footnote label + colored delta chip.
class KpiCard extends StatelessWidget {
  const KpiCard({
    super.key,
    required this.value,
    required this.label,
    required this.delta,
    this.deltaUp = true,
    this.valueColor,
    this.icon,
  });

  final String value;
  final String label;
  final String delta;
  final bool deltaUp;
  final Color? valueColor;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final deltaColor =
        (deltaUp ? QColors.wellbeing : QColors.danger).resolveFrom(context);
    final vColor = (valueColor ?? QColors.label).resolveFrom(context);
    return GlassCard(
      padding: const EdgeInsets.all(QSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 15, color: QColors.labelTertiary.resolveFrom(context)),
                const SizedBox(width: 5),
              ],
              Expanded(
                child: Text(
                  label,
                  style: QType.footnote,
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
          const SizedBox(height: 6),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                deltaUp ? CupertinoIcons.arrow_up_right : CupertinoIcons.arrow_down_right,
                size: 12,
                color: deltaColor,
              ),
              const SizedBox(width: 2),
              Flexible(
                child: Text(
                  delta,
                  style: QType.caption.copyWith(color: deltaColor, fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
