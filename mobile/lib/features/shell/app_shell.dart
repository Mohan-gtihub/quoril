import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/widgets/glass.dart';
import '../calendar/calendar_screen.dart';
import '../focus/focus_screen.dart';
import '../home/home_screen.dart';
import '../insights/insights_screen.dart';
import '../settings/you_screen.dart';

/// Height of the floating glass bar's capsule (excludes safe-area + gap).
const double _kBarHeight = 62;

/// Publishes the bottom inset the floating shell bar occupies, so every screen
/// can clear the bar automatically instead of hard-coding a magic bottom pad.
///
/// The shell injects this same value into `MediaQuery.padding.bottom` for its
/// pages, so screens using `SafeArea`/`MediaQuery` clear the bar for free.
/// Screens that lay out manually can read it via [QShellInsets.of].
class QShellInsets extends InheritedWidget {
  const QShellInsets({super.key, required this.bottom, required super.child});

  /// Total space reserved at the bottom of a page: bar height + gap + safe area.
  final double bottom;

  /// The reserved bottom inset in scope, or 0 when there is no shell above.
  static double of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<QShellInsets>()?.bottom ?? 0;

  @override
  bool updateShouldNotify(QShellInsets oldWidget) => bottom != oldWidget.bottom;
}

/// Root shell — Quoril's floating glass bar: Home · Calendar · (Session) ·
/// Insights · You. The centered Session button launches the focus timer. The
/// active tab pill AND the Session FAB tint follow the CURRENT section accent
/// (home=ember, calendar=grape, insights=sky, you=graphite) so color reinforces
/// place. Pages sit above the bar and clear it via [QShellInsets] / an injected
/// MediaQuery bottom inset.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  static const _pages = <Widget>[
    HomeScreen(),
    CalendarScreen(),
    InsightsScreen(),
    YouScreen(),
  ];

  /// Section accent for each tab, in tab order (Home · Calendar · Insights · You).
  /// Resolve at the call site. The Session FAB adopts the *current* tab's accent.
  static const _accents = <Color>[
    QSection.home, // ember
    QSection.calendar, // grape
    QSection.insights, // sky
    QSection.settings, // graphite
  ];

  void _select(int i) {
    if (i == _index) return;
    HapticFeedback.selectionClick();
    setState(() => _index = i);
  }

  void _launchSession() {
    HapticFeedback.mediumImpact();
    Navigator.of(context, rootNavigator: true).push(
      CupertinoPageRoute(fullscreenDialog: true, builder: (_) => const FocusScreen(task: null)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final safeBottom = media.padding.bottom;
    // Bar height + the QSpace.xs gap below it + the device safe area.
    final barInset = _kBarHeight + QSpace.xs + safeBottom;
    final reduced = QMotion.reduced(context);

    // Give pages a MediaQuery whose bottom padding already accounts for the bar,
    // so any SafeArea/inset-aware screen clears the floating bar automatically.
    final pageMedia = media.copyWith(
      padding: media.padding.copyWith(bottom: barInset),
    );

    Widget page = KeyedSubtree(
      key: ValueKey<int>(_index),
      child: _pages[_index],
    );
    if (!reduced) {
      page = AnimatedSwitcher(
        duration: QMotion.base,
        switchInCurve: QMotion.standard,
        switchOutCurve: QMotion.standard,
        transitionBuilder: (child, animation) =>
            FadeTransition(opacity: animation, child: child),
        // Fade the incoming page in over the outgoing one (fade-through feel)
        // while preserving each page's own scroll state via its ValueKey.
        layoutBuilder: (currentChild, previousChildren) => Stack(
          alignment: Alignment.topCenter,
          children: [...previousChildren, ?currentChild],
        ),
        child: page,
      );
    }

    return CupertinoPageScaffold(
      backgroundColor: QColors.bg.resolveFrom(context),
      child: QShellInsets(
        bottom: barInset,
        child: Stack(
          children: [
            Positioned.fill(
              child: MediaQuery(data: pageMedia, child: page),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(QSpace.xl, 0, QSpace.xl, QSpace.xs),
                  child: _FloatingBar(
                    index: _index,
                    accent: _accents[_index],
                    onSelect: _select,
                    onSession: _launchSession,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FloatingBar extends StatelessWidget {
  const _FloatingBar({
    required this.index,
    required this.accent,
    required this.onSelect,
    required this.onSession,
  });
  final int index;

  /// The current section's accent — drives the active pill + the Session FAB.
  final Color accent;
  final ValueChanged<int> onSelect;
  final VoidCallback onSession;

  @override
  Widget build(BuildContext context) {
    // The active tab and the FAB share ONE accent — the current section's — so
    // color signals place. Resolve here and thread it down.
    final tint = accent.resolveFrom(context);
    // True CHROME glass per the contract — the shared GlassSurface material
    // (native Liquid Glass on iOS 26) with tier-3 floating depth beneath it.
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(QRadius.capsule),
        boxShadow: QElevation.floating(context),
      ),
      child: GlassSurface(
        radius: QRadius.capsule,
        child: SizedBox(
          height: _kBarHeight,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: QSpace.xs),
            // Equal-weight cells so the center Session button is truly centered
            // regardless of the differing intrinsic widths of the glyphs.
            child: Row(
            children: [
              Expanded(
                child: _TabIcon(
                  icon: CupertinoIcons.house_fill,
                  label: 'Home',
                  active: index == 0,
                  tint: tint,
                  onTap: () => onSelect(0),
                ),
              ),
              Expanded(
                child: _TabIcon(
                  icon: CupertinoIcons.calendar,
                  label: 'Calendar',
                  active: index == 1,
                  tint: tint,
                  onTap: () => onSelect(1),
                ),
              ),
              Expanded(child: Center(child: _SessionButton(tint: tint, onTap: onSession))),
              Expanded(
                child: _TabIcon(
                  icon: CupertinoIcons.chart_bar_alt_fill,
                  label: 'Insights',
                  active: index == 2,
                  tint: tint,
                  onTap: () => onSelect(2),
                ),
              ),
              Expanded(
                child: _TabIcon(
                  icon: CupertinoIcons.person_fill,
                  label: 'You',
                  active: index == 3,
                  tint: tint,
                  onTap: () => onSelect(3),
                ),
              ),
            ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TabIcon extends StatelessWidget {
  const _TabIcon({
    required this.icon,
    required this.label,
    required this.active,
    required this.tint,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final bool active;

  /// The current section's resolved accent (drives the selected pill + label).
  final Color tint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final inactive = QColors.labelSecondary.resolveFrom(context);
    final glyphColor = active ? tint : inactive;
    return Semantics(
      label: label,
      button: true,
      selected: active,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Lightweight selection: a subtle section-tinted pill, no shadow —
            // the FAB stays the single elevated hero. The tint follows the
            // current section so the selected tab reads as "you are here".
            AnimatedContainer(
              duration: QMotion.duration(context, QMotion.fast),
              curve: QMotion.standard,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
              decoration: BoxDecoration(
                color: active ? tint.withValues(alpha: 0.14) : const Color(0x00000000),
                borderRadius: BorderRadius.circular(QRadius.capsule),
              ),
              child: Icon(icon, size: 22, color: glyphColor),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                height: 1.0,
                letterSpacing: 0.1,
                fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                color: active ? tint : inactive.withValues(alpha: 0.85),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SessionButton extends StatefulWidget {
  const _SessionButton({required this.tint, required this.onTap});

  /// The current section's resolved accent — the FAB adopts it so it feels
  /// anchored to the place you're launching a session from.
  final Color tint;
  final VoidCallback onTap;

  @override
  State<_SessionButton> createState() => _SessionButtonState();
}

class _SessionButtonState extends State<_SessionButton> {
  bool _pressed = false;

  void _setPressed(bool v) {
    if (_pressed == v) return;
    setState(() => _pressed = v);
  }

  @override
  Widget build(BuildContext context) {
    final tint = widget.tint;
    // A lighter rim derived from the section tint so the ring reads on any hue
    // (ember, grape, sky, graphite) — not just the ember brand highlight.
    final rim = Color.lerp(tint, CupertinoColors.white, 0.35)!;
    return Semantics(
      label: 'Start session',
      button: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTap,
        onTapDown: (_) => _setPressed(true),
        onTapUp: (_) => _setPressed(false),
        onTapCancel: () => _setPressed(false),
        // Lift the hero ~9px above the capsule so the core action is
        // unmistakable; the FAB owns the only elevation + accent ring.
        child: Transform.translate(
          offset: const Offset(0, -9),
          child: AnimatedScale(
            scale: _pressed ? 0.92 : 1.0,
            duration: QMotion.duration(context, QMotion.fast),
            curve: QMotion.standard,
            child: AnimatedContainer(
              duration: QMotion.duration(context, QMotion.base),
              curve: QMotion.standard,
              width: 52,
              height: 52,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: tint,
                shape: BoxShape.circle,
                border: Border.all(
                  color: rim.withValues(alpha: 0.8),
                  width: 1.5,
                ),
                boxShadow: QElevation.floating(context),
              ),
              child: const Icon(CupertinoIcons.play_fill, size: 24, color: CupertinoColors.white),
            ),
          ),
        ),
      ),
    );
  }
}
