import 'package:adaptive_platform_ui/adaptive_platform_ui.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/widgets/app_kit.dart';
import '../calendar/calendar_screen.dart';
import '../focus/focus_screen.dart';
import '../home/home_screen.dart';
import '../insights/insights_screen.dart';
import '../settings/you_screen.dart';

/// Root shell — Quoril's floating glass bar: Home · Calendar · (Session) ·
/// Insights · You. The centered Session button launches the focus timer; the
/// active tab shows a filled circle. Pages sit above the bar so nothing hides.
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
    return CupertinoPageScaffold(
      backgroundColor: QColors.bg.resolveFrom(context),
      child: Stack(
        children: [
          Positioned.fill(child: IndexedStack(index: _index, children: _pages)),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(QSpace.xl, 0, QSpace.xl, QSpace.xs),
                child: _FloatingBar(index: _index, onSelect: _select, onSession: _launchSession),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FloatingBar extends StatelessWidget {
  const _FloatingBar({required this.index, required this.onSelect, required this.onSession});
  final int index;
  final ValueChanged<int> onSelect;
  final VoidCallback onSession;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(QRadius.capsule);
    return DecoratedBox(
      decoration: BoxDecoration(borderRadius: radius, boxShadow: QElevation.floating(context)),
      child: AdaptiveBlurView(
        borderRadius: radius,
        child: Container(
          height: 62,
          decoration: BoxDecoration(
            color: QColors.surface.resolveFrom(context).withValues(alpha: 0.55),
            borderRadius: radius,
            border: Border.all(color: QColors.separator.resolveFrom(context).withValues(alpha: 0.4), width: 0.5),
          ),
          padding: const EdgeInsets.symmetric(horizontal: QSpace.xs),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _TabIcon(icon: CupertinoIcons.house_fill, active: index == 0, onTap: () => onSelect(0)),
              _TabIcon(icon: CupertinoIcons.calendar, active: index == 1, onTap: () => onSelect(1)),
              _SessionButton(onTap: onSession),
              _TabIcon(icon: CupertinoIcons.chart_bar_alt_fill, active: index == 2, onTap: () => onSelect(2)),
              _TabIcon(icon: CupertinoIcons.person_fill, active: index == 3, onTap: () => onSelect(3)),
            ],
          ),
        ),
      ),
    );
  }
}

class _TabIcon extends StatelessWidget {
  const _TabIcon({required this.icon, required this.active, required this.onTap});
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

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
          color: active ? CupertinoColors.white : const Color(0x00000000),
          shape: BoxShape.circle,
          boxShadow: active ? QElevation.floating(context) : null,
        ),
        child: Icon(icon, size: 22, color: active ? kAccent : QColors.labelSecondary.resolveFrom(context).withValues(alpha: 0.7)),
      ),
    );
  }
}

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
        decoration: BoxDecoration(color: kAccent, shape: BoxShape.circle, boxShadow: QElevation.floating(context)),
        child: const Icon(CupertinoIcons.stopwatch_fill, size: 24, color: CupertinoColors.white),
      ),
    );
  }
}
