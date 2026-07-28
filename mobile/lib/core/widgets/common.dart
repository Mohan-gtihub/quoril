import 'package:flutter/cupertino.dart';
import '../theme/tokens.dart';
import '../theme/typography.dart';

/// Centered empty state: symbol + line + optional action.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.message, this.action});
  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(QSpace.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: QColors.labelTertiary.resolveFrom(context)),
            const SizedBox(height: QSpace.md),
            Text(title, style: QType.title3, textAlign: TextAlign.center),
            if (message != null) ...[
              const SizedBox(height: QSpace.xs),
              Text(message!, style: QType.subhead, textAlign: TextAlign.center),
            ],
            if (action != null) ...[const SizedBox(height: QSpace.lg), action!],
          ],
        ),
      ),
    );
  }
}

/// Small pill chip: icon + label. Used for stats and metadata.
class QChip extends StatelessWidget {
  const QChip({super.key, this.icon, required this.label, this.color});
  final IconData? icon;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = (color ?? QColors.labelSecondary).resolveFrom(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 5),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(QRadius.capsule),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 13, color: c), const SizedBox(width: 4)],
          Text(label, style: QType.footnote.copyWith(color: c, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Format helpers.
String fmtHm(int seconds) {
  final h = seconds ~/ 3600;
  final m = (seconds % 3600) ~/ 60;
  if (h > 0) return '${h}h ${m}m';
  return '${m}m';
}

String fmtClock(int seconds) {
  final m = seconds ~/ 60;
  final s = seconds % 60;
  return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
}
