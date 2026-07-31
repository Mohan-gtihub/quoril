import 'dart:math' as math;

import 'package:flutter/cupertino.dart';

import '../../../core/data/mock_data.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Apple Fitness–style "Summary" components: the triple Activity Rings and a
/// dark Activity card with big colored metric labels. Pure black canvas, SF
/// type, tabular numerals — clean and Apple-native.

// Ring gradients (Fitness palette, adapted to Quoril's three metrics).
const _focusA = Color(0xFFFA114F); // Focus  — magenta→coral
const _focusB = Color(0xFFFF6482);
const _sessA = Color(0xFF7DE028); // Sessions — green
const _sessB = Color(0xFFB6F84A);
const _protA = Color(0xFF17E0E8); // Protected — cyan
const _protB = Color(0xFF00B8D4);

class ActivityData {
  const ActivityData({
    required this.focusFrac,
    required this.sessionsFrac,
    required this.protectedFrac,
  });
  final double focusFrac;
  final double sessionsFrac;
  final double protectedFrac;
}

// ---------------------------------------------------------------------------
// The three concentric activity rings.
// ---------------------------------------------------------------------------

class ActivityRings extends StatelessWidget {
  const ActivityRings({super.key, required this.data, this.size = 150});
  final ActivityData data;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _RingsPainter(data)),
    );
  }
}

class _RingsPainter extends CustomPainter {
  _RingsPainter(this.data);
  final ActivityData data;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final stroke = size.width * 0.115;
    final gap = stroke * 0.34;
    final r0 = (size.width - stroke) / 2;
    final r1 = r0 - stroke - gap;
    final r2 = r1 - stroke - gap;

    _ring(canvas, center, r0, stroke, data.focusFrac, _focusA, _focusB);
    _ring(canvas, center, r1, stroke, data.sessionsFrac, _sessA, _sessB);
    _ring(canvas, center, r2, stroke, data.protectedFrac, _protA, _protB);
  }

  void _ring(Canvas canvas, Offset c, double r, double stroke, double frac,
      Color a, Color b) {
    // Recessed track (the ring color, dimmed).
    final track = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..color = a.withValues(alpha: 0.22);
    canvas.drawCircle(c, r, track);

    final f = frac.clamp(0.0, 1.0);
    if (f <= 0) return;

    final rect = Rect.fromCircle(center: c, radius: r);
    final arc = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..shader = SweepGradient(
        colors: [a, b, a],
        stops: const [0.0, 0.5, 1.0],
        transform: const GradientRotation(-math.pi / 2),
      ).createShader(rect);
    canvas.drawArc(rect, -math.pi / 2, 2 * math.pi * f, false, arc);
  }

  @override
  bool shouldRepaint(covariant _RingsPainter old) =>
      old.data.focusFrac != data.focusFrac ||
      old.data.sessionsFrac != data.sessionsFrac ||
      old.data.protectedFrac != data.protectedFrac;
}

// ---------------------------------------------------------------------------
// Activity card — rings + three colored metric rows (Fitness layout).
// ---------------------------------------------------------------------------

class ActivityCard extends StatelessWidget {
  const ActivityCard({super.key, required this.tasksDone, required this.tasksTotal});
  final int tasksDone;
  final int tasksTotal;

  static const _focusGoalMin = 240;
  static const _protGoalMin = 60;
  static const _sessGoal = 5;

  @override
  Widget build(BuildContext context) {
    final focusMin = Mock.focusTodaySeconds ~/ 60;
    final protMin = Mock.savedSeconds ~/ 60;
    final sessDone = Mock.recentSessions.length;

    final data = ActivityData(
      focusFrac: focusMin / _focusGoalMin,
      sessionsFrac: sessDone / _sessGoal,
      protectedFrac: protMin / _protGoalMin,
    );

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
      child: Container(
        padding: const EdgeInsets.all(QSpace.lg),
        decoration: BoxDecoration(
          color: QColors.surface.resolveFrom(context),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _Metric(label: 'FOCUS', value: '$focusMin', goal: '/$_focusGoalMin', unit: 'MIN', color: _focusB),
                  const SizedBox(height: QSpace.md),
                  _Metric(label: 'SESSIONS', value: '$sessDone', goal: '/$_sessGoal', unit: '', color: _sessB),
                  const SizedBox(height: QSpace.md),
                  _Metric(label: 'PROTECTED', value: '$protMin', goal: '/$_protGoalMin', unit: 'MIN', color: _protB),
                ],
              ),
            ),
            const SizedBox(width: QSpace.md),
            ActivityRings(data: data, size: 148),
          ],
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.label,
    required this.value,
    required this.goal,
    required this.unit,
    required this.color,
  });
  final String label;
  final String value;
  final String goal;
  final String unit;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final white = QColors.label.resolveFrom(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: QType.caption.copyWith(
            color: color,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 1),
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: value,
                style: QType.title1.copyWith(
                  color: white,
                  fontWeight: FontWeight.w700,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              TextSpan(
                text: '$goal${unit.isEmpty ? '' : ' $unit'}',
                style: QType.headline.copyWith(
                  color: color,
                  fontWeight: FontWeight.w700,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Weekly focus trend card (Fitness "Trends" idiom).
// ---------------------------------------------------------------------------

class FocusTrendCard extends StatelessWidget {
  const FocusTrendCard({super.key});

  static const _days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  @override
  Widget build(BuildContext context) {
    final values = Mock.weekTrend;
    final total = values.fold<int>(0, (a, b) => a + b);
    final maxV = values.fold<int>(1, (a, b) => b > a ? b : a);
    final white = QColors.label.resolveFrom(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
      child: Container(
        padding: const EdgeInsets.all(QSpace.lg),
        decoration: BoxDecoration(
          color: QColors.surface.resolveFrom(context),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text('Focus', style: QType.headline.copyWith(color: _focusB, fontWeight: FontWeight.w700)),
                const Spacer(),
                Text(
                  '${(total / 60).toStringAsFixed(1)}h this week',
                  style: QType.footnote.copyWith(
                    color: QColors.labelSecondary.resolveFrom(context),
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
            const SizedBox(height: QSpace.md),
            SizedBox(
              height: 96,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (var i = 0; i < values.length; i++) ...[
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Container(
                            height: (values[i] / maxV * 74).clamp(6, 74),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: i == values.length - 1
                                    ? const [_focusB, _focusA]
                                    : [
                                        _focusB.withValues(alpha: 0.35),
                                        _focusA.withValues(alpha: 0.35),
                                      ],
                              ),
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _days[i],
                            style: QType.caption.copyWith(
                              color: i == values.length - 1
                                  ? white
                                  : QColors.labelTertiary.resolveFrom(context),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (i < values.length - 1) const SizedBox(width: 8),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
