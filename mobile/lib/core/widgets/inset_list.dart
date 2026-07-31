import 'package:flutter/cupertino.dart';
import '../theme/tokens.dart';
import '../theme/typography.dart';

/// Grouped-inset section (the Settings-app look).
class InsetSection extends StatelessWidget {
  const InsetSection({super.key, this.header, this.footer, required this.children});

  final String? header;
  final String? footer;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      rows.add(children[i]);
      if (i != children.length - 1) {
        rows.add(Padding(
          padding: const EdgeInsets.only(left: 52),
          child: Container(height: 0.5, color: QColors.separator.resolveFrom(context)),
        ));
      }
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (header != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(QSpace.md + QSpace.xs, QSpace.md, QSpace.md, QSpace.xs),
            child: Text(header!.toUpperCase(), style: QType.sectionHeader),
          ),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: QSpace.md),
          decoration: BoxDecoration(
            color: QColors.surface.resolveFrom(context),
            borderRadius: BorderRadius.circular(QRadius.card),
          ),
          child: Column(children: rows),
        ),
        if (footer != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(QSpace.md + QSpace.xs, QSpace.xs, QSpace.md, QSpace.md),
            child: Text(footer!, style: QType.footnote),
          ),
      ],
    );
  }
}

/// A single inset-list row: leading icon, title, optional value/trailing, tap.
class InsetRow extends StatelessWidget {
  const InsetRow({
    super.key,
    this.icon,
    this.iconColor,
    required this.title,
    this.value,
    this.trailing,
    this.onTap,
    this.showChevron = true,
    this.destructive = false,
  });

  final IconData? icon;
  final Color? iconColor;
  final String title;
  final String? value;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool showChevron;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final titleColor =
        destructive ? QColors.danger.resolveFrom(context) : QColors.label.resolveFrom(context);
    final row = Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: 11),
      child: Row(
        children: [
          if (icon != null) ...[
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: (iconColor ?? QColors.tint).resolveFrom(context),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(icon, size: 17, color: CupertinoColors.white),
            ),
            const SizedBox(width: QSpace.sm),
          ],
          Expanded(child: Text(title, style: QType.body.copyWith(color: titleColor))),
          if (value != null)
            Padding(
              padding: const EdgeInsets.only(left: QSpace.xs),
              child: Text(value!, style: QType.body.copyWith(color: QColors.labelSecondary)),
            ),
          ?trailing,
          if (onTap != null && showChevron && trailing == null)
            Padding(
              padding: const EdgeInsets.only(left: QSpace.xxs),
              child: Icon(CupertinoIcons.chevron_right,
                  size: 16, color: QColors.labelTertiary.resolveFrom(context)),
            ),
        ],
      ),
    );
    if (onTap == null) return row;
    return GestureDetector(onTap: onTap, behavior: HitTestBehavior.opaque, child: row);
  }
}
