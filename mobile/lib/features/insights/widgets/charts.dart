import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/cupertino.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Thin, tinted week-trend line chart with minimal axes (Apple restraint).
class TrendLineChart extends StatelessWidget {
  const TrendLineChart({super.key, required this.values, this.color});

  final List<int> values;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = (color ?? QColors.tint).resolveFrom(context);
    final labelC = QColors.labelTertiary.resolveFrom(context);
    final maxV = (values.isEmpty ? 1 : values.reduce((a, b) => a > b ? a : b)).toDouble();
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return LineChart(
      LineChartData(
        minY: 0,
        maxY: maxV * 1.15,
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: 1,
              reservedSize: 22,
              getTitlesWidget: (v, meta) {
                final i = v.toInt();
                if (i < 0 || i >= days.length) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(days[i], style: QType.caption.copyWith(color: labelC)),
                );
              },
            ),
          ),
        ),
        lineTouchData: const LineTouchData(enabled: false),
        lineBarsData: [
          LineChartBarData(
            spots: [
              for (var i = 0; i < values.length; i++) FlSpot(i.toDouble(), values[i].toDouble()),
            ],
            isCurved: true,
            curveSmoothness: 0.32,
            color: c,
            barWidth: 2.5,
            isStrokeCapRound: true,
            dotData: FlDotData(
              show: true,
              checkToShowDot: (spot, bar) => spot.x == values.length - 1,
              getDotPainter: (spot, pct, bar, i) =>
                  FlDotCirclePainter(radius: 3.5, color: c, strokeWidth: 0),
            ),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [c.withValues(alpha: 0.22), c.withValues(alpha: 0.0)],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 24-bar hourly heatmap (thin rounded bars, tinted by intensity).
class HourlyBarChart extends StatelessWidget {
  const HourlyBarChart({super.key, required this.hourly, this.color});

  final List<int> hourly;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = (color ?? QColors.tint).resolveFrom(context);
    final labelC = QColors.labelTertiary.resolveFrom(context);
    final maxV = (hourly.isEmpty ? 1 : hourly.reduce((a, b) => a > b ? a : b)).toDouble();

    return BarChart(
      BarChartData(
        maxY: maxV * 1.1,
        alignment: BarChartAlignment.spaceBetween,
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        barTouchData: BarTouchData(enabled: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: 6,
              reservedSize: 20,
              getTitlesWidget: (v, meta) {
                final i = v.toInt();
                if (i % 6 != 0) return const SizedBox.shrink();
                final label = i == 0
                    ? '12a'
                    : i == 12
                        ? '12p'
                        : i < 12
                            ? '${i}a'
                            : '${i - 12}p';
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(label, style: QType.caption.copyWith(color: labelC)),
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
                  color: c.withValues(alpha: maxV == 0 ? 0.3 : (0.35 + 0.65 * (hourly[i] / maxV))),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

/// Category donut PieChart with a legend row.
class CategoryDonut extends StatelessWidget {
  const CategoryDonut({super.key, required this.slices});

  final List<CategorySlice> slices;

  @override
  Widget build(BuildContext context) {
    final total = slices.fold<double>(0, (s, e) => s + e.value);
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    return Row(
      children: [
        SizedBox(
          width: 120,
          height: 120,
          child: PieChart(
            duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 320),
            PieChartData(
              sectionsSpace: 2,
              centerSpaceRadius: 34,
              startDegreeOffset: -90,
              sections: [
                for (final s in slices)
                  PieChartSectionData(
                    value: s.value,
                    color: s.color.resolveFrom(context),
                    radius: 22,
                    showTitle: false,
                  ),
              ],
            ),
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
                        total == 0 ? '0%' : '${(s.value / total * 100).round()}%',
                        style: QType.footnote.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
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
