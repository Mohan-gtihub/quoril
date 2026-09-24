import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/glass.dart';

/// The faint graphite ambient wash for every Settings / Integrations screen.
/// A barely-there [QSection.settings] tint fading to the neutral grouped page
/// background so the frosted [GlassCard] surfaces have something to refract
/// (a flat page bg makes the glass material invisible). Wrap an [AppScaffold]
/// in this and give that scaffold a transparent background so the wash shows
/// through. Renders behind the whole page, chrome + body alike.
class SettingsAmbientBackground extends StatelessWidget {
  const SettingsAmbientBackground({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final b = MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;
    return GradientBackground(
      gradient: QGradients.ambient(QSection.settings.resolveFrom(context), b),
      child: child,
    );
  }
}

/// The settings-feature inset-grouped surface, now rendered on the shared
/// FROSTED [GlassCard] material (a whisper of graphite [QSection.settings] tint)
/// so grouped lists refract the faint ambient wash like the rest of the app —
/// while KEEPING the Apple-Settings pattern: 0.5pt inset hairline separators
/// between rows and 44pt-min rows. Drop-in replacement for the kit's `QGroup`.
///
/// Legibility: neutral system ink (label / labelSecondary / labelTertiary) stays
/// WCAG-AA over the translucent frost in both light and dark; the frost is a
/// resting content material, not a colored fill.
class FrostedGroup extends StatelessWidget {
  const FrostedGroup({super.key, required this.children, this.radius = QRadius.card});

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
    return GlassCard(
      padding: EdgeInsets.zero,
      radius: radius,
      tint: QSection.settings,
      child: Column(children: rows),
    );
  }
}

/// A tap wrapper that flashes a native touch-down highlight (scale + fade),
/// matching the pressable feedback the inset rows provide. Use it to give the
/// feature's custom tappables (time chips, steppers, plan tiles) the same
/// tactile response as the grouped rows.
class Pressable extends StatefulWidget {
  const Pressable({
    super.key,
    required this.child,
    required this.onTap,
    this.pressedOpacity = 0.55,
    this.pressedScale = 0.97,
    this.behavior = HitTestBehavior.opaque,
  });

  final Widget child;
  final VoidCallback onTap;
  final double pressedOpacity;
  final double pressedScale;
  final HitTestBehavior behavior;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _pressed = false;

  void _set(bool v) => setState(() => _pressed = v);

  @override
  Widget build(BuildContext context) {
    final duration = QMotion.duration(context, const Duration(milliseconds: 90));
    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => _set(true),
      onTapUp: (_) => _set(false),
      onTapCancel: () => _set(false),
      behavior: widget.behavior,
      child: AnimatedScale(
        scale: _pressed ? widget.pressedScale : 1.0,
        duration: duration,
        curve: Curves.easeOut,
        child: AnimatedOpacity(
          opacity: _pressed ? widget.pressedOpacity : 1.0,
          duration: duration,
          child: widget.child,
        ),
      ),
    );
  }
}

/// A rounded icon tile — the small colored square that leads a settings row.
/// Colored leading tiles are the Apple-Settings signature (the one splash of
/// categorical color the grouped rows carry); [QRow] stays monochrome, so this
/// is the genuinely-unique helper the editorial kit doesn't cover.
class QIconTile extends StatelessWidget {
  const QIconTile({
    super.key,
    required this.icon,
    required this.color,
    this.size = 29,
  });

  final IconData icon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.iconTile),
      ),
      child: Icon(icon, size: size * 0.58, color: CupertinoColors.white),
    );
  }
}

/// A single 44pt-min settings row for use inside a [QGroup]: a colored leading
/// tile, a body-styled title, a meta-styled trailing value or custom trailing
/// widget, and an optional chevron. This is the settings-feature parallel of
/// the kit's [QRow] — same geometry and press-tint, plus the colored tile.
class SettingsRow extends StatefulWidget {
  const SettingsRow({
    super.key,
    this.icon,
    this.iconColor,
    required this.title,
    this.value,
    this.trailing,
    this.onTap,
    this.chevron = true,
    this.destructive = false,
    this.centered = false,
  });

  final IconData? icon;
  final Color? iconColor;
  final String title;
  final String? value;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool chevron;
  final bool destructive;

  /// Centered title with no tile/chevron — for Sign Out / Delete style rows.
  final bool centered;

  @override
  State<SettingsRow> createState() => _SettingsRowState();
}

class _SettingsRowState extends State<SettingsRow> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final titleColor = widget.destructive
        ? QColors.danger.resolveFrom(context)
        : QColors.label.resolveFrom(context);
    final title = Text(widget.title, style: QType.body.copyWith(color: titleColor));

    final content = AnimatedContainer(
      duration: QMotion.duration(context, const Duration(milliseconds: 90)),
      color: _pressed
          ? QColors.fill.resolveFrom(context).withValues(alpha: 0.5)
          : const Color(0x00000000),
      constraints: const BoxConstraints(minHeight: 48),
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.xs),
      child: Row(
        children: [
          if (widget.centered)
            Expanded(child: Center(child: title))
          else ...[
            if (widget.icon != null) ...[
              QIconTile(icon: widget.icon!, color: widget.iconColor ?? QColors.tint),
              const SizedBox(width: QSpace.sm),
            ],
            Expanded(child: title),
            if (widget.trailing != null)
              widget.trailing!
            else if (widget.value != null)
              Flexible(
                child: Text(
                  widget.value!,
                  style: QType.meta,
                  textAlign: TextAlign.right,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            if (widget.onTap != null && widget.chevron && widget.trailing == null) ...[
              const SizedBox(width: QSpace.xs),
              Icon(CupertinoIcons.chevron_right,
                  size: 16, color: QColors.labelTertiary.resolveFrom(context)),
            ],
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

/// Convenience: a settings row whose trailing control is a [CupertinoSwitch].
class SettingsSwitchRow extends StatelessWidget {
  const SettingsSwitchRow({
    super.key,
    this.icon,
    this.iconColor,
    required this.title,
    required this.value,
    required this.onChanged,
  });

  final IconData? icon;
  final Color? iconColor;
  final String title;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SettingsRow(
      icon: icon,
      iconColor: iconColor,
      title: title,
      chevron: false,
      trailing: CupertinoSwitch(
        value: value,
        onChanged: (v) {
          HapticFeedback.selectionClick();
          onChanged(v);
        },
      ),
    );
  }
}

/// A quiet grouped-section footnote, indented to align under the group card.
class SettingsFootnote extends StatelessWidget {
  const SettingsFootnote(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xs, QSpace.md, 0),
      child: Text(text, style: QType.footnote),
    );
  }
}

/// The editorial modal-sheet recipe: a grabber (36×5), top corners at a literal
/// 28, the `bgGrouped` ground, and floating (tier-3) depth. Callers supply the
/// sheet body; [showSettingsSheet] wraps it in a [showCupertinoModalPopup].
class SettingsSheet extends StatelessWidget {
  const SettingsSheet({super.key, required this.child, this.heightFactor});

  final Widget child;
  final double? heightFactor;

  @override
  Widget build(BuildContext context) {
    final panel = Container(
      decoration: BoxDecoration(
        color: QColors.bgGrouped.resolveFrom(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: QElevation.floating(context),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
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
          heightFactor != null ? Expanded(child: child) : Flexible(child: child),
        ],
      ),
    );
    if (heightFactor == null) return panel;
    return FractionallySizedBox(heightFactor: heightFactor, child: panel);
  }
}

/// A small sheet scaffold with a Cancel / title / Done header for committing
/// picker edits only on Done. Uses the editorial sheet ground + 28pt corners.
class SheetPickerScaffold extends StatelessWidget {
  const SheetPickerScaffold({
    super.key,
    required this.title,
    required this.child,
    required this.onCancel,
    required this.onDone,
    this.height = 300,
  });

  final String title;
  final Widget child;
  final VoidCallback onCancel;
  final VoidCallback onDone;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: QColors.bgGrouped.resolveFrom(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: QElevation.floating(context),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: QSpace.md, vertical: QSpace.xs),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                      color: QColors.separator.resolveFrom(context),
                      width: 0.5),
                ),
              ),
              child: Row(
                children: [
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(44, 44),
                    onPressed: onCancel,
                    child: const Text('Cancel'),
                  ),
                  Expanded(
                    child: Text(title,
                        textAlign: TextAlign.center, style: QType.headline),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(44, 44),
                    onPressed: onDone,
                    child: const Text('Done',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
            Expanded(child: child),
          ],
        ),
      ),
    );
  }
}
