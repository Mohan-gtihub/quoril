import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../core/theme/tokens.dart';
import '../home/home_screen.dart';
import '../insights/insights_screen.dart';
import '../settings/you_screen.dart';

/// Root tab shell — 3 tabs (minimal). Home is the Blitzit-style board;
/// Focus mode is launched full-screen from Home's Start Focus action.
class AppShell extends StatelessWidget {
  const AppShell({super.key});

  @override
  Widget build(BuildContext context) {
    return CupertinoTabScaffold(
      tabBar: CupertinoTabBar(
        backgroundColor: QColors.bg.resolveFrom(context).withValues(alpha: 0.80),
        activeColor: QColors.tint.resolveFrom(context),
        inactiveColor: QColors.labelSecondary.resolveFrom(context),
        border: Border(top: BorderSide(color: QColors.separator.resolveFrom(context), width: 0.0)),
        onTap: (_) => HapticFeedback.selectionClick(),
        items: const [
          BottomNavigationBarItem(icon: Icon(CupertinoIcons.house_fill), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(CupertinoIcons.chart_bar_alt_fill), label: 'Insights'),
          BottomNavigationBarItem(icon: Icon(CupertinoIcons.person_crop_circle), label: 'You'),
        ],
      ),
      tabBuilder: (context, index) => CupertinoTabView(
        builder: (context) => switch (index) {
          0 => const HomeScreen(),
          1 => const InsightsScreen(),
          _ => const YouScreen(),
        },
      ),
    );
  }
}
