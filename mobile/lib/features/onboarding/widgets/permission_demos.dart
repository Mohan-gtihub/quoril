import 'package:flutter/cupertino.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import 'brand.dart';

/// Which behavior a permission page previews.
enum PermissionDemo { screenTime, notifications }

/// Animated illustration of the OUTCOME a permission unlocks. For Screen Time
/// we slide up a mock intercept card; for Notifications we animate in a sample
/// nudge toast. Honors Reduce Motion (shows the resting state instantly).
class PermissionIllustration extends StatefulWidget {
  const PermissionIllustration({super.key, required this.demo});
  final PermissionDemo demo;

  @override
  State<PermissionIllustration> createState() => _PermissionIllustrationState();
}

class _PermissionIllustrationState extends State<PermissionIllustration>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (QMotion.reduced(context)) {
        _c.value = 1;
      } else {
        _c.forward();
      }
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 132,
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final t = Curves.easeOutCubic.transform(_c.value);
          return widget.demo == PermissionDemo.screenTime
              ? _interceptCard(t)
              : _nudgeToast(t);
        },
      ),
    );
  }

  // Mock intercept card sliding up from the bottom — the moment Quoril steps in.
  Widget _interceptCard(double t) {
    return Stack(
      children: [
        Positioned.fill(
          child: Align(
            alignment: Alignment.bottomCenter,
            child: Opacity(
              opacity: t,
              child: Transform.translate(
                offset: Offset(0, (1 - t) * 40),
                child: Container(
                  padding: const EdgeInsets.all(QSpace.md),
                  decoration: BoxDecoration(
                    color: CupertinoColors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(QRadius.glass),
                    border: Border.all(color: kGlassBorder, width: 1),
                    boxShadow: QElevation.floating(context),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: CupertinoColors.white.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(QRadius.row),
                        ),
                        child: const Icon(CupertinoIcons.hand_raised_fill,
                            size: 20, color: CupertinoColors.white),
                      ),
                      const SizedBox(width: QSpace.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Hold on — Instagram?',
                                style: QType.headline
                                    .copyWith(color: kFgPrimary)),
                            const SizedBox(height: 1),
                            Text('You wanted to stay in focus.',
                                style: QType.footnote
                                    .copyWith(color: kFgSecondary)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // Sample nudge toast animating in from the top — a rare, well-timed nudge.
  Widget _nudgeToast(double t) {
    return Align(
      alignment: Alignment.topCenter,
      child: Opacity(
        opacity: t,
        child: Transform.translate(
          offset: Offset(0, (1 - t) * -32),
          child: Container(
            padding: const EdgeInsets.symmetric(
                horizontal: QSpace.md, vertical: QSpace.sm),
            decoration: BoxDecoration(
              color: CupertinoColors.white.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(QRadius.capsule),
              border: Border.all(color: kGlassBorder, width: 1),
              boxShadow: QElevation.floating(context),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 34,
                  height: 34,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: CupertinoColors.white,
                  ),
                  child: const Icon(QBrand.mark,
                      size: 18, color: Color(0xFF2A0A06)),
                ),
                const SizedBox(width: QSpace.sm),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Quoril',
                        style: QType.footnoteEmphasized
                            .copyWith(color: kFgPrimary)),
                    const SizedBox(height: 1),
                    Text('Drifting a little — back to it?',
                        style: QType.footnote.copyWith(color: kFgSecondary)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
