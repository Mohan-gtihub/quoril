import 'package:adaptive_platform_ui/adaptive_platform_ui.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../calendar/calendar_screen.dart';
import '../focus/focus_screen.dart';
import '../home/home_screen.dart';
import '../insights/insights_screen.dart';
import '../settings/you_screen.dart';

/// Root shell — a custom floating glass tab bar (reference "Warm Aurora" look):
/// five slots [Home · Calendar · Session · Insights · You] where the centered
/// Session slot launches the full-screen focus timer, and the active real tab
/// is marked with a filled white circle.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0; // land on the Home dashboard (Fitness-style Summary)

  static const _pages = <Widget>[
    HomeScreen(),
    CalendarScreen(),
    InsightsScreen(),
    YouScreen(),
  ];

  void _select(int i) {
    if (i == _index) return;
    HapticFeedback.selectionClick();
    setState(() => _index = i);
  }

  void _launchSession() {
    HapticFeedback.mediumImpact();
    Navigator.of(context, rootNavigator: true).push(
      CupertinoPageRoute(
        fullscreenDialog: true,
        builder: (_) => const FocusScreen(task: null),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: QColors.bg.resolveFrom(context),
      child: Stack(
        children: [
          IndexedStack(index: _index, children: _pages),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(QSpace.xl, 0, QSpace.xl, QSpace.xs),
                child: _FloatingTabBar(
                  index: _index,
                  onSelect: _select,
                  onSession: _launchSession,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FloatingTabBar extends StatelessWidget {
  const _FloatingTabBar({
    required this.index,
    required this.onSelect,
    required this.onSession,
  });

  final int index;
  final ValueChanged<int> onSelect;
  final VoidCallback onSession;

  @override
  Widget build(BuildContext context) {
    final label = QColors.label.resolveFrom(context);
    final radius = BorderRadius.circular(QRadius.capsule);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: QElevation.floating(context),
      ),
      // Real Liquid Glass on iOS 26 (native UIVisualEffectView), graceful
      // BackdropFilter fallback on iOS <26 / Android.
      child: AdaptiveBlurView(
        borderRadius: radius,
        child: Container(
          height: 60,
          decoration: BoxDecoration(
            color: QColors.surface.resolveFrom(context).withValues(alpha: 0.45),
            borderRadius: radius,
            border: Border.all(
              color: QColors.separator.resolveFrom(context).withValues(alpha: 0.4),
              width: 0.5,
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: QSpace.xs),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _TabIcon(icon: CupertinoIcons.house_fill, active: index == 0, onTap: () => onSelect(0), color: label),
              _TabIcon(icon: CupertinoIcons.calendar, active: index == 1, onTap: () => onSelect(1), color: label),
              _SessionButton(onTap: onSession),
              _TabIcon(icon: CupertinoIcons.chart_bar_alt_fill, active: index == 2, onTap: () => onSelect(2), color: label),
              _TabIcon(icon: CupertinoIcons.person_fill, active: index == 3, onTap: () => onSelect(3), color: label),
            ],
          ),
        ),
      ),
    );
  }
}

class _TabIcon extends StatelessWidget {
  const _TabIcon({
    required this.icon,
    required this.active,
    required this.onTap,
    required this.color,
  });

  final IconData icon;
  final bool active;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: QMotion.fast,
        curve: QMotion.standard,
        width: 46,
        height: 46,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? CupertinoColors.white : CupertinoColors.transparent,
          shape: BoxShape.circle,
          boxShadow: active ? QElevation.floating(context) : null,
        ),
        child: Icon(
          icon,
          size: 22,
          color: active
              ? QColors.breakColor.resolveFrom(context)
              : color.withValues(alpha: 0.55),
        ),
      ),
    );
  }
}

/// Centered prominent Session action — a warm-accent circle.
class _SessionButton extends StatelessWidget {
  const _SessionButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        width: 48,
        height: 48,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: QColors.breakColor.resolveFrom(context),
          shape: BoxShape.circle,
          boxShadow: QElevation.floating(context),
        ),
        child: const Icon(CupertinoIcons.stopwatch_fill, size: 24, color: CupertinoColors.white),
      ),
    );
  }
}
