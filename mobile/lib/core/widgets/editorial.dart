import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../theme/tokens.dart';
import '../theme/typography.dart';
import 'glass.dart';

/// EMBER EDITORIAL widget kit — the shared vocabulary every screen is built
/// from so the whole app reads as one hand. Grouped surface cards (tier-1
/// depth), quiet section headers, inset hairline rows, and a calm staggered
/// entrance. Ember is spent only where the caller passes it (CTA / selection /
/// the one focal accent) — these primitives stay neutral by default.
///
/// Rules of the house:
///  • Cards = QColors.surface, radius 16, tier-1 shadow. Never a border.
///  • Rows live inside a [QGroup]; the group draws inset hairlines between them.
///  • Section labels use [QSectionHeader] (normal-case string → drawn as a
///    tracked, quiet eyebrow). Never hand-roll letterSpacing.
///  • Wrap a screen's first list in [QStagger] for the one-time settle-in.

/// A resting surface card — now rendered with the shared FROSTED [GlassCard]
/// material by default so content cards across the app upgrade consistently
/// (Apple-style frosted glass over the faint ambient wash). Its constructor
/// signature and behavior are UNCHANGED: same [padding]/[radius]/[onTap], the
/// same press-scale + selection haptic. When an explicit opaque [color] is
/// passed the caller wants a solid surface (a deliberate colored moment), so
/// that path stays a flat filled container rather than frosted glass.
class QCard extends StatefulWidget {
  const QCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(QSpace.md),
    this.radius = QRadius.card,
    this.onTap,
    this.color,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final VoidCallback? onTap;
  final Color? color;

  @override
  State<QCard> createState() => _QCardState();
}

class _QCardState extends State<QCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    // Default (no explicit color) → the shared frosted glass material.
    if (widget.color == null) {
      return GlassCard(
        padding: widget.padding,
        radius: widget.radius,
        onTap: widget.onTap,
        child: widget.child,
      );
    }

    // Explicit opaque color → a deliberate solid surface (unchanged behavior).
    final reduced = QMotion.reduced(context);
    final card = AnimatedScale(
      scale: _pressed && !reduced ? 0.98 : 1.0,
      duration: QMotion.duration(context, QMotion.fast),
      curve: QMotion.standard,
      child: Container(
        padding: widget.padding,
        decoration: BoxDecoration(
          color: widget.color!.resolveFrom(context),
          borderRadius: BorderRadius.circular(widget.radius),
          boxShadow: QElevation.card(context),
        ),
        child: widget.child,
      ),
    );
    if (widget.onTap == null) return card;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: () {
        HapticFeedback.selectionClick();
        widget.onTap!();
      },
      child: card,
    );
  }
}

/// A quiet section header: a normal-case label rendered as a tracked eyebrow,
/// with an optional trailing action (e.g. "Custom ›"). The label is the one
/// piece of structure — it names what follows, it never decorates.
class QSectionHeader extends StatelessWidget {
  const QSectionHeader({super.key, required this.label, this.trailing, this.padding});

  final String label;
  final Widget? trailing;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? const EdgeInsets.only(left: QSpace.xxs, bottom: QSpace.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(child: Text(label.toUpperCase(), style: QType.eyebrow)),
          ?trailing,
        ],
      ),
    );
  }
}

/// Groups [QRow]s (or any children) into one inset-grouped surface card with
/// 0.5pt hairlines between them — the Apple Settings pattern, editorial-tuned.
class QGroup extends StatelessWidget {
  const QGroup({super.key, required this.children, this.radius = QRadius.card});

  final List<Widget> children;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      if (i > 0) {
        rows.add(Container(
          height: 0.5,
          margin: const EdgeInsets.only(left: QSpace.md),
          color: QColors.separator.resolveFrom(context).withValues(alpha: 0.6),
        ));
      }
      rows.add(children[i]);
    }
    return Container(
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(radius),
        boxShadow: QElevation.card(context),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Column(children: rows),
      ),
    );
  }
}

/// A single 44pt-min inset row for use inside a [QGroup]: leading icon, label,
/// trailing value or custom widget, optional chevron. Tappable rows press-tint.
class QRow extends StatefulWidget {
  const QRow({
    super.key,
    this.icon,
    required this.label,
    this.value,
    this.valueColor,
    this.trailing,
    this.onTap,
    this.chevron = true,
  });

  final IconData? icon;
  final String label;
  final String? value;
  final Color? valueColor;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool chevron;

  @override
  State<QRow> createState() => _QRowState();
}

class _QRowState extends State<QRow> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final content = AnimatedContainer(
      duration: QMotion.duration(context, const Duration(milliseconds: 90)),
      color: _pressed
          ? QColors.fill.resolveFrom(context).withValues(alpha: 0.5)
          : const Color(0x00000000),
      constraints: const BoxConstraints(minHeight: 48),
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.sm),
      child: Row(
        children: [
          if (widget.icon != null) ...[
            Icon(widget.icon, size: 20, color: QColors.labelSecondary.resolveFrom(context)),
            const SizedBox(width: QSpace.sm),
          ],
          Expanded(child: Text(widget.label, style: QType.body)),
          if (widget.trailing != null)
            widget.trailing!
          else if (widget.value != null)
            Text(
              widget.value!,
              style: QType.meta.copyWith(
                color: (widget.valueColor ?? QColors.labelSecondary).resolveFrom(context),
              ),
            ),
          if (widget.onTap != null && widget.chevron) ...[
            const SizedBox(width: QSpace.xs),
            Icon(CupertinoIcons.chevron_right, size: 16, color: QColors.labelTertiary.resolveFrom(context)),
          ],
        ],
      ),
    );
    if (widget.onTap == null) return content;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: () {
        HapticFeedback.selectionClick();
        widget.onTap!();
      },
      child: content,
    );
  }
}

/// One-time entrance: each child fades in and rises 8pt, offset by 50ms, capped
/// so long lists don't feel slow. Honors Reduce Motion (renders instantly).
class QStagger extends StatelessWidget {
  const QStagger({
    super.key,
    required this.children,
    this.cap = 8,
    this.axis = Axis.vertical,
    this.crossAxisAlignment = CrossAxisAlignment.stretch,
  });

  final List<Widget> children;
  final int cap;
  final Axis axis;
  final CrossAxisAlignment crossAxisAlignment;

  @override
  Widget build(BuildContext context) {
    final reduced = QMotion.reduced(context);
    final wrapped = <Widget>[
      for (var i = 0; i < children.length; i++)
        reduced
            ? children[i]
            : _StaggerItem(delay: QMotion.stagger * (i.clamp(0, cap)), child: children[i]),
    ];
    return axis == Axis.vertical
        ? Column(crossAxisAlignment: crossAxisAlignment, mainAxisSize: MainAxisSize.min, children: wrapped)
        : Row(mainAxisSize: MainAxisSize.min, children: wrapped);
  }
}

class _StaggerItem extends StatefulWidget {
  const _StaggerItem({required this.delay, required this.child});
  final Duration delay;
  final Widget child;

  @override
  State<_StaggerItem> createState() => _StaggerItemState();
}

/// A metric / stat cell — a big tabular value with a quiet caption below and an
/// optional accent eyebrow / icon above. The value uses tabular figures so
/// numbers never jitter. Drop several into a Row (wrapped in [QCard] or a
/// [QGroup]) to build a stat strip. Neutral by default; pass a section [accent]
/// to tint the eyebrow + icon.
class QMetricCell extends StatelessWidget {
  const QMetricCell({
    super.key,
    required this.value,
    this.label,
    this.eyebrow,
    this.icon,
    this.accent,
    this.valueStyle,
    this.alignment = CrossAxisAlignment.start,
  });

  final String value;

  /// Quiet caption under the value (e.g. "focused today").
  final String? label;

  /// Optional tracked kicker above the value (rendered in [accent]).
  final String? eyebrow;
  final IconData? icon;

  /// Section accent for the eyebrow + icon. Defaults to neutral secondary ink.
  final Color? accent;

  /// Override the value type (defaults to [QType.title2Emphasized] w/ tabular).
  final TextStyle? valueStyle;
  final CrossAxisAlignment alignment;

  @override
  Widget build(BuildContext context) {
    final a = (accent ?? QColors.labelSecondary).resolveFrom(context);
    final vStyle = (valueStyle ?? QType.title2Emphasized).copyWith(
      fontFeatures: const [FontFeature.tabularFigures()],
      color: QColors.label.resolveFrom(context),
    );
    return Column(
      crossAxisAlignment: alignment,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (eyebrow != null || icon != null)
          Padding(
            padding: const EdgeInsets.only(bottom: QSpace.xxs),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 13, color: a),
                  if (eyebrow != null) const SizedBox(width: 4),
                ],
                if (eyebrow != null)
                  Text(eyebrow!.toUpperCase(), style: QType.eyebrow.copyWith(color: a)),
              ],
            ),
          ),
        Text(value, style: vStyle),
        if (label != null)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(label!, style: QType.footnote),
          ),
      ],
    );
  }
}

/// An accent-aware segmented control (the iOS pill selector). A thin wrapper
/// over [CupertinoSlidingSegmentedControl] that tints the selected thumb ink
/// with the screen's section [accent] and applies consistent type. Generic over
/// the segment key [T] so it drops into any existing selection state.
class QSegmentedControl<T extends Object> extends StatelessWidget {
  const QSegmentedControl({
    super.key,
    required this.groupValue,
    required this.children,
    required this.onValueChanged,
    this.accent,
  });

  final T groupValue;

  /// Segment key → label widget (usually a `Text`). Order is preserved.
  final Map<T, Widget> children;
  final ValueChanged<T?> onValueChanged;

  /// Section accent used to tint the selected label. Defaults to ember.
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final a = (accent ?? QColors.brand).resolveFrom(context);
    final styled = <T, Widget>{
      for (final e in children.entries)
        e.key: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
          child: DefaultTextStyle.merge(
            style: QType.footnoteEmphasized.copyWith(
              color: e.key == groupValue ? a : QColors.labelSecondary.resolveFrom(context),
            ),
            child: e.value,
          ),
        ),
    };
    return CupertinoSlidingSegmentedControl<T>(
      groupValue: groupValue,
      onValueChanged: onValueChanged,
      backgroundColor: QColors.tertiaryFill.resolveFrom(context),
      thumbColor: QColors.surface.resolveFrom(context),
      children: styled,
    );
  }
}

class _StaggerItemState extends State<_StaggerItem> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 360));
  late final Animation<double> _fade = CurvedAnimation(parent: _c, curve: Curves.easeOut);
  late final Animation<Offset> _slide = Tween(begin: const Offset(0, 0.08), end: Offset.zero)
      .animate(CurvedAnimation(parent: _c, curve: QMotion.gentleOvershoot));

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(widget.delay, () {
      if (mounted) _c.forward();
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(position: _slide, child: widget.child),
    );
  }
}
