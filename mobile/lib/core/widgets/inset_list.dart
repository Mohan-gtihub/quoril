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
/// Tappable rows flash a native touch-down highlight — the tactile feedback
/// that separates a real iOS list from a Flutter list.
class InsetRow extends StatefulWidget {
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
    this.centered = false,
  });

  final IconData? icon;
  final Color? iconColor;
  final String title;
  final String? value;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool showChevron;
  final bool destructive;

  /// Centered title with no icon/chevron — for Sign Out / Delete style rows.
  final bool centered;

  @override
  State<InsetRow> createState() => _InsetRowState();
}

class _InsetRowState extends State<InsetRow> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final titleColor = widget.destructive
        ? QColors.danger.resolveFrom(context)
        : QColors.label.resolveFrom(context);
    final titleStyle = QType.body.copyWith(
      color: titleColor,
      fontWeight: widget.centered ? FontWeight.w400 : FontWeight.w400,
    );
    final title = widget.centered
        ? Center(child: Text(widget.title, style: titleStyle))
        : Expanded(child: Text(widget.title, style: titleStyle));

    final row = Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: 11),
      child: Row(
        children: [
          if (widget.icon != null) ...[
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: (widget.iconColor ?? QColors.tint).resolveFrom(context),
                borderRadius: BorderRadius.circular(QRadius.iconTile),
              ),
              child: Icon(widget.icon, size: 17, color: CupertinoColors.white),
            ),
            const SizedBox(width: QSpace.sm),
          ],
          title,
          if (widget.value != null)
            Padding(
              padding: const EdgeInsets.only(left: QSpace.xs),
              child: Text(widget.value!,
                  style: QType.body.copyWith(color: QColors.labelSecondary)),
            ),
          ?widget.trailing,
          if (widget.onTap != null &&
              widget.showChevron &&
              widget.trailing == null &&
              !widget.centered)
            Padding(
              padding: const EdgeInsets.only(left: QSpace.xxs),
              child: Icon(CupertinoIcons.chevron_right,
                  size: 16, color: QColors.labelTertiary.resolveFrom(context)),
            ),
        ],
      ),
    );
    if (widget.onTap == null) return row;
    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 90),
        color: _pressed
            ? QColors.fill.resolveFrom(context).withValues(alpha: 0.5)
            : const Color(0x00000000),
        child: row,
      ),
    );
  }
}
