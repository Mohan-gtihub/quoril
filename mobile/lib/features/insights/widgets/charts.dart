import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/common.dart';

/// Shared value formatter for chart tooltips: chart values are minutes, so we
/// render them through the app-wide fmtHm (which expects seconds).
String _fmtMinutes(num minutes) => fmtHm((minutes * 60).round());

/// Glass tooltip background used by every touch-enabled chart. A dark,
/// translucent capsule so it reads on any wash without borrowing brand color.
final _tooltipBg = CupertinoColors.systemGrey6.darkColor.withValues(alpha: 0.94);

/// Thin, tinted week-trend line chart with a gradient stroke, an interactive
/// scrub indicator, a glass tooltip, and selection haptics.
class TrendLineChart extends StatefulWidget {
  const TrendLineChart({
    super.key,
    required this.values,
    this.color,
    this.gradient,
    this.labels,
    this.semanticsLabel,
  });

  final List<int> values;

  /// Solid fallback tint (used for area fill + dot). When [gradient] is given
  /// the stroke uses the gradient instead of this flat color.
  final Color? color;

  /// Optional 2-stop ember-family stroke gradient (e.g. QGradients.ringFocus).
  final List<Color>? gradient;

  /// Optional custom x-axis labels; defaults to weekday initials.
  final List<String>? labels;

  final String? semanticsLabel;

  @override
  State<TrendLineChart> createState() => _TrendLineChartState();
}

class _TrendLineChartState extends State<TrendLineChart> {
  int? _touchedIndex;

  @override
  Widget build(BuildContext context) {
    final values = widget.values;
    final c = (widget.color ?? QColors.tint).resolveFrom(context);
    final labelC = QColors.labelTertiary.resolveFrom(context);
    final maxV =
        (values.isEmpty ? 1 : values.reduce((a, b) => a > b ? a : b)).toDouble();
    final labels = widget.labels ?? const ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    final stroke = widget.gradient;

    final total = values.fold<int>(0, (s, e) => s + e);
    final semantics = widget.semanticsLabel ??
        'Trend chart, ${values.length} points, '
            'total ${_fmtMinutes(total)}, peak ${_fmtMinutes(maxV)}.';

    return Semantics(
      label: semantics,
      child: LineChart(
        duration: QMotion.duration(context, const Duration(milliseconds: 260)),
        LineChartData(
          minY: 0,
          maxY: maxV * 1.15,
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles:
                const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                interval: 1,
                reservedSize: 24,
                getTitlesWidget: (v, meta) {
                  final i = v.toInt();
                  if (i < 0 || i >= labels.length) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(labels[i],
                        style: QType.footnote.copyWith(color: labelC)),
                  );
                },
              ),
            ),
          ),
          lineTouchData: LineTouchData(
            enabled: true,
            touchCallback: (event, resp) {
              final idx = resp?.lineBarSpots?.isNotEmpty == true
                  ? resp!.lineBarSpots!.first.spotIndex
                  : null;
              if (idx != _touchedIndex) {
                if (idx != null) HapticFeedback.selectionClick();
                setState(() => _touchedIndex = idx);
              }
            },
            getTouchedSpotIndicator: (bar, indexes) => [
              for (final _ in indexes)
                TouchedSpotIndicatorData(
                  FlLine(color: c.withValues(alpha: 0.55), strokeWidth: 1.5),
                  FlDotData(
                    getDotPainter: (spot, pct, b, i) => FlDotCirclePainter(
                      radius: 4.5,
                      color: c,
                      strokeWidth: 2,
                      strokeColor: CupertinoColors.white,
                    ),
                  ),
                ),
            ],
            touchTooltipData: LineTouchTooltipData(
              getTooltipColor: (_) => _tooltipBg,
              tooltipRoundedRadius: 8,
              tooltipPadding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              getTooltipItems: (spots) => [
                for (final s in spots)
                  LineTooltipItem(
                    _fmtMinutes(s.y),
                    QType.footnoteEmphasized.copyWith(
                      color: CupertinoColors.white,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
              ],
            ),
          ),
          lineBarsData: [
            LineChartBarData(
              spots: [
                for (var i = 0; i < values.length; i++)
                  FlSpot(i.toDouble(), values[i].toDouble()),
              ],
              isCurved: true,
              curveSmoothness: 0.32,
              color: stroke == null ? c : null,
              gradient: stroke == null
                  ? null
                  : LinearGradient(colors: stroke),
              barWidth: 2.8,
              isStrokeCapRound: true,
              dotData: FlDotData(
                show: true,
                // The one emphasized endpoint — a ringed ember dot that reads as
                // "where you are now", the chart's single focal accent.
                checkToShowDot: (spot, bar) => spot.x == values.length - 1,
                getDotPainter: (spot, pct, bar, i) => FlDotCirclePainter(
                  radius: 4,
                  color: c,
                  strokeWidth: 2.5,
                  strokeColor: QColors.surface.resolveFrom(context),
                ),
              ),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [c.withValues(alpha: 0.24), c.withValues(alpha: 0.0)],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 24-bar hourly chart with a vertical ember gradient, an interactive glass
/// tooltip + selection haptics, and the peak hour annotated with its value.
class HourlyBarChart extends StatefulWidget {
  const HourlyBarChart({super.key, required this.hourly, this.color});

  final List<int> hourly;
  final Color? color;

  @override
  State<HourlyBarChart> createState() => _HourlyBarChartState();
}

class _HourlyBarChartState extends State<HourlyBarChart> {
  String _hourLabel(int i) => i == 0
      ? '12a'
      : i == 12
          ? '12p'
          : i < 12
              ? '${i}a'
              : '${i - 12}p';

  @override
  Widget build(BuildContext context) {
    final hourly = widget.hourly;
    final c = (widget.color ?? QColors.tint).resolveFrom(context);
    final labelC = QColors.labelTertiary.resolveFrom(context);
    final maxV =
        (hourly.isEmpty ? 1 : hourly.reduce((a, b) => a > b ? a : b)).toDouble();
    // Index of the peak hour, annotated inline so height isn't the only cue.
    var peakIdx = 0;
    for (var i = 0; i < hourly.length; i++) {
      if (hourly[i] > hourly[peakIdx]) peakIdx = i;
    }

    final semantics = 'Hourly distraction chart. Peak at '
        '${_hourLabel(peakIdx)}, ${_fmtMinutes(maxV)}.';

    return Semantics(
      label: semantics,
      child: BarChart(
        duration: QMotion.duration(context, const Duration(milliseconds: 260)),
        BarChartData(
          maxY: maxV * 1.22,
          alignment: BarChartAlignment.spaceBetween,
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          barTouchData: BarTouchData(
            enabled: true,
            touchCallback: (event, resp) {
              if (event.isInterestedForInteractions &&
                  resp?.spot != null) {
                HapticFeedback.selectionClick();
              }
            },
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: (_) => _tooltipBg,
              tooltipRoundedRadius: 8,
              tooltipPadding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              getTooltipItem: (group, gi, rod, ri) => BarTooltipItem(
                '${_hourLabel(group.x)}\n',
                QType.caption2.copyWith(color: CupertinoColors.white),
                children: [
                  TextSpan(
                    text: _fmtMinutes(rod.toY),
                    style: QType.footnoteEmphasized.copyWith(
                      color: CupertinoColors.white,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
            ),
          ),
          titlesData: FlTitlesData(
            topTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                interval: 1,
                reservedSize: 18,
                getTitlesWidget: (v, meta) {
                  // Annotate only the peak hour with its value.
                  if (v.toInt() != peakIdx) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(
                      _fmtMinutes(hourly[peakIdx]),
                      style: QType.caption2.copyWith(
                        color: c,
                        fontWeight: FontWeight.w700,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  );
                },
              ),
            ),
            rightTitles:
                const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                interval: 6,
                reservedSize: 20,
                getTitlesWidget: (v, meta) {
                  final i = v.toInt();
                  if (i % 6 != 0) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(_hourLabel(i),
                        style: QType.footnote.copyWith(color: labelC)),
                  );
                },
              ),
            ),
          ),
          barGroups: [
            for (var i = 0; i < hourly.length; i++)
              BarChartGroupData(
                x: i,
                barRods: [
                  BarChartRodData(
                    toY: hourly[i].toDouble(),
                    width: 5,
                    borderRadius: BorderRadius.circular(3),
                    // Height encodes value; a single vertical ember gradient
                    // gives every bar the same read (no redundant opacity ramp).
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [c.withValues(alpha: 0.55), c],
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

/// Category donut PieChart with a total in the center and minutes + percent in
/// the legend. A minimum slice angle keeps tiny categories legible.
class CategoryDonut extends StatelessWidget {
  const CategoryDonut({super.key, required this.slices, this.centerUnit = 'm'});

  final List<CategorySlice> slices;

  /// Unit label shown under the center total.
  final String centerUnit;

  @override
  Widget build(BuildContext context) {
    final total = slices.fold<double>(0, (s, e) => s + e.value);
    final reduceMotion = QMotion.reduced(context);

    // Enforce a minimum sweep so a tiny slice never collapses to a sliver.
    const minAngle = 8.0; // degrees
    final displayValues = <double>[];
    if (total > 0) {
      var floored = 0.0;
      for (final s in slices) {
        final raw = s.value / total * 360.0;
        final v = raw < minAngle ? minAngle : raw;
        displayValues.add(v);
        floored += v - raw;
      }
      // Reclaim the borrowed degrees from the largest slice so the ring stays 360.
      if (floored > 0) {
        var maxI = 0;
        for (var i = 1; i < displayValues.length; i++) {
          if (displayValues[i] > displayValues[maxI]) maxI = i;
        }
        displayValues[maxI] =
            (displayValues[maxI] - floored).clamp(minAngle, 360.0);
      }
    }

    final labelC = QColors.labelSecondary.resolveFrom(context);

    return Semantics(
      label: 'Category mix, total ${_fmtMinutes(total)}. '
          '${slices.map((s) => '${s.label} ${total == 0 ? 0 : (s.value / total * 100).round()} percent').join(', ')}',
      child: Row(
        children: [
          SizedBox(
            width: 120,
            height: 120,
            child: Stack(
              alignment: Alignment.center,
              children: [
                PieChart(
                  duration:
                      reduceMotion ? Duration.zero : const Duration(milliseconds: 320),
                  PieChartData(
                    sectionsSpace: 2,
                    centerSpaceRadius: 34,
                    startDegreeOffset: -90,
                    sections: [
                      for (var i = 0; i < slices.length; i++)
                        PieChartSectionData(
                          value: total == 0 ? 1 : displayValues[i],
                          color: slices[i].color.resolveFrom(context),
                          radius: 22,
                          showTitle: false,
                        ),
                    ],
                  ),
                ),
                // Center: the day's total distracted time (tabular figures).
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      total == 0 ? '0' : fmtHm((total * 60).round()),
                      style: QType.title3Emphasized.copyWith(
                        letterSpacing: -0.5,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    Text('total', style: QType.caption2.copyWith(color: labelC)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: QSpace.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final s in slices)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: s.color.resolveFrom(context),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                        const SizedBox(width: QSpace.xs),
                        Expanded(child: Text(s.label, style: QType.subhead)),
                        Text(
                          _fmtMinutes(s.value),
                          style: QType.footnoteEmphasized.copyWith(
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                        const SizedBox(width: QSpace.xs),
                        SizedBox(
                          width: 34,
                          child: Text(
                            total == 0
                                ? '0%'
                                : '${(s.value / total * 100).round()}%',
                            textAlign: TextAlign.end,
                            style: QType.footnote.copyWith(color: labelC),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class CategorySlice {
  const CategorySlice({required this.label, required this.value, required this.color});
  final String label;
  final double value;
  final CupertinoDynamicColor color;
}

/// A single horizontal proportional bar row (label · value · track).
class HBarRow extends StatelessWidget {
  const HBarRow({
    super.key,
    required this.label,
    required this.valueLabel,
    required this.fraction,
    required this.color,
    this.leading,
  });

  final String label;
  final String valueLabel;
  final double fraction;
  final Color color;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final c = color;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (leading != null) ...[leading!, const SizedBox(width: QSpace.xs)],
              Expanded(child: Text(label, style: QType.subhead.copyWith(color: QColors.label.resolveFrom(context)))),
              Text(valueLabel, style: QType.footnote.copyWith(fontWeight: FontWeight.w600, color: c)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(QRadius.capsule),
            child: Stack(
              children: [
                Container(height: 7, color: c.withValues(alpha: 0.14)),
                FractionallySizedBox(
                  widthFactor: fraction.clamp(0.02, 1.0),
                  child: Container(height: 7, color: c),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
