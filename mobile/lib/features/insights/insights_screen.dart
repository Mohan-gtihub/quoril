import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/data/mock_data.dart';
import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/editorial.dart';
import '../../core/widgets/primary_button.dart';
import 'app_detail_page.dart';
import 'intervention_history_page.dart';
import 'widgets/charts.dart';
import 'widgets/kpi_card.dart';

/// The single section accent for Insights — sky (data / analytics). Sky is the
/// only chromatic signal on this screen: chart series, active selection, the
/// hero focus metric, section eyebrows. Everything else stays neutral system ink.
const List<Color> _skySpark = [Color(0xFF5CB4FF), Color(0xFF2E9BFF)];

enum _Tab { reports, screenTime }

enum _Range { day, week }

/// INSIGHTS — native iOS reports + distraction-forward screen time.
/// StatelessWidget shell (const) delegating tab/range state to a private body.
class InsightsScreen extends StatelessWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _InsightsBody();
  }
}

class _InsightsBody extends StatefulWidget {
  const _InsightsBody();

  @override
  State<_InsightsBody> createState() => _InsightsBodyState();
}

class _InsightsBodyState extends State<_InsightsBody> {
  _Tab _tab = _Tab.reports;
  _Range _range = _Range.week;

  void _openApp(AppUsage app) {
    HapticFeedback.selectionClick();
    Navigator.of(context).push(
      CupertinoPageRoute(builder: (_) => AppDetailPage(app: app)),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Faint sky ambient wash behind the body so frosted content cards have
    // something to refract; the AppScaffold is made transparent to let it show.
    final brightness =
        MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;
    return GradientBackground(
      gradient: QGradients.ambient(
        QSection.insights.resolveFrom(context),
        brightness,
      ),
      child: AppScaffold(
        backgroundColor: CupertinoColors.transparent,
        title: 'Insights',
        slivers: [
        SliverToBoxAdapter(child: _summaryLine(context)),
        SliverToBoxAdapter(child: _controls(context)),
          if (_tab == _Tab.reports)
            ..._reports(context)
          else
            ..._screenTime(context),
          const SliverToBoxAdapter(child: SizedBox(height: QSpace.xxl)),
        ],
      ),
    );
  }

  // --------------------------------------------------------------- SUMMARY
  /// A single calm meta line under the large title summarizing today. Neutral
  /// system ink — the one sky focal on this screen is the hero Focus KPI below.
  Widget _summaryLine(BuildContext context) {
    final sky = QSection.insights.resolveFrom(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xxs, QSpace.md, 0),
      child: Row(
        children: [
          Text('${Mock.streakDays}-day streak',
              style: QType.eyebrow.copyWith(color: sky)),
          const SizedBox(width: QSpace.sm),
          Container(
            width: 3,
            height: 3,
            decoration: BoxDecoration(
              color: QColors.labelTertiary.resolveFrom(context),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: QSpace.sm),
          Expanded(
            child: Text(
              '${fmtHm(Mock.focusTodaySeconds)} focused today · '
              '${Mock.productivityScore}% score',
              style: QType.footnote,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------------------- CONTROLS
  Widget _controls(BuildContext context) {
    final sky = QSection.insights.resolveFrom(context);
    return Padding(
      padding:
          const EdgeInsets.fromLTRB(QSpace.md, QSpace.lg, QSpace.md, QSpace.xs),
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: QSegmentedControl<_Tab>(
              accent: sky,
              groupValue: _tab,
              onValueChanged: (v) {
                if (v == null) return;
                HapticFeedback.selectionClick();
                setState(() => _tab = v);
              },
              children: const {
                _Tab.reports: Text('Reports'),
                _Tab.screenTime: Text('Screen Time'),
              },
            ),
          ),
          const SizedBox(height: QSpace.sm),
          QSegmentedControl<_Range>(
            accent: sky,
            groupValue: _range,
            onValueChanged: (v) {
              if (v == null) return;
              HapticFeedback.selectionClick();
              setState(() => _range = v);
            },
            children: const {
              _Range.day: Padding(
                padding: EdgeInsets.symmetric(horizontal: 18),
                child: Text('Day'),
              ),
              _Range.week: Padding(
                padding: EdgeInsets.symmetric(horizontal: 18),
                child: Text('Week'),
              ),
            },
          ),
        ],
      ),
    );
  }

  // Section wrapper: a resting QCard titled by a quiet QSectionHeader (eyebrow)
  // with an optional trailing meta value.
  Widget _card(BuildContext context, String title,
      {String? trailing, required Widget child}) {
    return QCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          QSectionHeader(
            label: title,
            padding: EdgeInsets.zero,
            trailing:
                trailing == null ? null : Text(trailing, style: QType.meta),
          ),
          const SizedBox(height: QSpace.md),
          child,
        ],
      ),
    );
  }

  // Distinct Day vs Week datasets so the range toggle actually changes data.
  _ReportData _reportData(bool isDay) {
    final avgSession = Mock.recentSessions.isEmpty
        ? 0
        : Mock.recentSessions
                .map((s) => s.durationSeconds)
                .reduce((a, b) => a + b) ~/
            Mock.recentSessions.length;
    final top = Mock.topApps
        .where((a) => a.distracting)
        .reduce((a, b) => a.minutes >= b.minutes ? a : b);

    if (isDay) {
      // Today only: last point of the week trend, hour-of-day shape.
      const dayTrend = [12, 22, 8, 30, 18, 26, 40]; // per 3-hour block, minutes
      return _ReportData(
        focusSeconds: Mock.focusTodaySeconds,
        focusDelta: '18% vs avg',
        focusSpark: dayTrend,
        trend: dayTrend,
        trendLabels: const ['6a', '9a', '12p', '3p', '6p', '9p', '12a'],
        tasksDone: '8/11',
        tasksDelta: '2 more than yesterday',
        productivityScore: Mock.productivityScore,
        scoreDelta: '5 pts',
        scoreUp: true,
        avgSession: avgSession,
        avgDelta: '4m longer',
        avgUp: true,
        appSwitches: 31,
        switchDelta: '6 more than usual',
        switchUp: false, // more switching == worse
        topDistraction: top,
        categories: [
          _CatRow('Deep Work', '2h 12m', 1.0, QColors.workspacePalette[2]),
          _CatRow('Design', '1h 28m', 0.66, QColors.workspacePalette[7]),
          _CatRow('Meetings', '42m', 0.32, QColors.workspacePalette[0]),
          _CatRow('Admin', '25m', 0.19, QColors.labelSecondary),
        ],
      );
    }

    // Week aggregate.
    return _ReportData(
      focusSeconds: Mock.weekTrend.reduce((a, b) => a + b) * 60,
      focusDelta: '11% vs last week',
      focusSpark: Mock.weekTrend,
      trend: Mock.weekTrend,
      trendLabels: const ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      tasksDone: '46/58',
      tasksDelta: '9 more than last week',
      productivityScore: 74,
      scoreDelta: '3 pts',
      scoreUp: false, // honest: down vs a strong prior week
      avgSession: avgSession + 120,
      avgDelta: '2m shorter',
      avgUp: false,
      appSwitches: 214,
      switchDelta: '34 fewer',
      switchUp: true, // fewer switches == better
      topDistraction: top,
      categories: [
        _CatRow('Deep Work', '11h 5m', 1.0, QColors.workspacePalette[2]),
        _CatRow('Design', '7h 12m', 0.65, QColors.workspacePalette[7]),
        _CatRow('Meetings', '4h 40m', 0.42, QColors.workspacePalette[0]),
        _CatRow('Admin', '2h 18m', 0.21, QColors.labelSecondary),
      ],
    );
  }

  // ---------------------------------------------------------------- REPORTS
  List<Widget> _reports(BuildContext context) {
    final isDay = _range == _Range.day;
    final d = _reportData(isDay);
    final sky = QSection.insights.resolveFrom(context);

    // Hero: Focus Time promoted full-width with a sky sparkline — the single
    // color moment of the Reports tab.
    final hero = KpiCard(
      value: fmtHm(d.focusSeconds),
      label: 'Focus Time',
      delta: d.focusDelta,
      deltaUp: true,
      valueColor: QSection.insights, // the one sky focal
      accent: sky,
      icon: CupertinoIcons.timer,
      hero: true,
      sparkline: d.focusSpark,
      sparkGradient: _skySpark,
    );

    // Demoted 2-up grid. Deltas vary honestly (not all green/up).
    final kpis = <Widget>[
      KpiCard(
        value: d.tasksDone,
        label: 'Tasks Done',
        delta: d.tasksDelta,
        deltaUp: true,
        icon: CupertinoIcons.checkmark_circle,
      ),
      KpiCard(
        value: '${d.productivityScore}%',
        label: 'Productivity Score',
        delta: d.scoreDelta,
        deltaUp: d.scoreUp,
        icon: CupertinoIcons.gauge,
      ),
      KpiCard(
        value: fmtHm(d.avgSession),
        label: 'Avg Session',
        delta: d.avgDelta,
        deltaUp: d.avgUp,
        icon: CupertinoIcons.circle_grid_hex,
      ),
      KpiCard(
        value: '${d.appSwitches}',
        label: 'App Switches',
        // More switching is worse → fewer is an improvement (down-good = green up-arrow reads wrong);
        // show honest direction: switches rose today, so this is a regression.
        delta: d.switchDelta,
        deltaUp: d.switchUp,
        icon: CupertinoIcons.arrow_2_squarepath,
      ),
    ];

    // KPI grid: two calm 2-up rows (compact QCards) under the ember hero.
    final grid = Column(
      children: [
        for (var r = 0; r < kpis.length; r += 2)
          Padding(
            padding: EdgeInsets.only(top: r == 0 ? 0 : QSpace.sm),
            // IntrinsicHeight bounds the cross-axis so `stretch` gives both
            // cards equal height without forcing infinite height (the row sits
            // in an unbounded-height scroll view — plain stretch would assert).
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: kpis[r]),
                  const SizedBox(width: QSpace.sm),
                  Expanded(
                      child: r + 1 < kpis.length
                          ? kpis[r + 1]
                          : const SizedBox.shrink()),
                ],
              ),
            ),
          ),
      ],
    );

    // One sliver, one QStagger settle-in for the whole report feed.
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.md, QSpace.md, 0),
        sliver: SliverToBoxAdapter(
          child: QStagger(
            children: [
              hero,
              const SizedBox(height: QSpace.md),
              grid,
              const SizedBox(height: QSpace.md),
              DistractionKpiCard(
                appName: d.topDistraction.name,
                appIcon: d.topDistraction.icon,
                detail:
                    '${d.topDistraction.minutes}m ${isDay ? 'today' : 'daily avg'}',
              ),
              const SizedBox(height: QSpace.xl),
              _card(
                context,
                'Performance',
                trailing: isDay ? 'Today' : 'This week',
                child: SizedBox(
                  height: 150,
                  child: TrendLineChart(
                    values: d.trend,
                    gradient: _skySpark, // sky series stroke
                    color: sky,
                    labels: d.trendLabels,
                  ),
                ),
              ),
              const SizedBox(height: QSpace.md),
              QCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const QSectionHeader(
                        label: 'Category breakdown', padding: EdgeInsets.zero),
                    const SizedBox(height: QSpace.sm),
                    // Deliberate category scale (indigo→teal→blue→neutral) — kept
                    // clear of the sky focal so it stays reserved for focus totals.
                    for (final cat in d.categories)
                      HBarRow(
                        label: cat.label,
                        valueLabel: cat.valueLabel,
                        fraction: cat.fraction,
                        color: cat.color.resolveFrom(context),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: QSpace.md),
              QCard(
                child: Row(
                  children: [
                    _iconBadge(CupertinoIcons.scope,
                        QColors.wellbeing.resolveFrom(context)),
                    const SizedBox(width: QSpace.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Estimation accuracy', style: QType.subhead),
                          const SizedBox(height: 2),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                '86%',
                                style: QType.title2.copyWith(
                                  color: QColors.wellbeing.resolveFrom(context),
                                  fontFeatures: const [
                                    FontFeature.tabularFigures()
                                  ],
                                ),
                              ),
                              const SizedBox(width: QSpace.xs),
                              Text('on-target estimates', style: QType.footnote),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ];
  }

  // ------------------------------------------------------------- SCREEN TIME
  List<Widget> _screenTime(BuildContext context) {
    final danger = QColors.danger.resolveFrom(context);
    final green = QColors.wellbeing.resolveFrom(context);
    final distracting = Mock.topApps.where((a) => a.distracting).toList()
      ..sort((a, b) => b.minutes.compareTo(a.minutes));
    final maxMin = distracting.isEmpty
        ? 1
        : distracting.map((e) => e.minutes).reduce((a, b) => a > b ? a : b);

    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.md, QSpace.md, 0),
        sliver: SliverToBoxAdapter(
          child: QStagger(
            children: [
              // Verdict — the honest cost, in danger red (a semantic state hue).
              QCard(
                padding: const EdgeInsets.all(QSpace.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Today you lost', style: QType.subhead),
                    const SizedBox(height: 2),
                    Text(
                      fmtHm(Mock.lostToDistractionSeconds),
                      style: QType.hero.copyWith(
                        color: danger,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text('to distractions', style: QType.subhead),
                    const SizedBox(height: QSpace.sm),
                    QChip(
                      icon: CupertinoIcons.arrow_down,
                      label: '22m better than your average',
                      color: QColors.wellbeing,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: QSpace.md),
              // Where it went
              QCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const QSectionHeader(
                        label: 'Where it went', padding: EdgeInsets.zero),
                    const SizedBox(height: QSpace.sm),
                    for (final a in distracting)
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () => _openApp(a),
                        child: HBarRow(
                          label: a.name,
                          valueLabel: '${a.minutes}m',
                          fraction: a.minutes / maxMin,
                          color: danger,
                          leading: Icon(a.icon, size: 15, color: danger),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: QSpace.md),
              // Win card
              QCard(
                child: Row(
                  children: [
                    _iconBadge(CupertinoIcons.shield_lefthalf_fill, green),
                    const SizedBox(width: QSpace.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          RichText(
                            text: TextSpan(
                              style: QType.callout.copyWith(
                                  color: QColors.label.resolveFrom(context)),
                              children: [
                                const TextSpan(text: 'Quoril saved you '),
                                TextSpan(
                                  text: fmtHm(Mock.savedSeconds),
                                  style: QType.callout.copyWith(
                                      fontWeight: FontWeight.w700, color: green),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Icon(CupertinoIcons.flame_fill,
                                  size: 13,
                                  color: QColors.breakColor.resolveFrom(context)),
                              const SizedBox(width: 4),
                              Text('${Mock.streakDays}-day streak',
                                  style: QType.footnote),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: QSpace.md),
              // Cost translation
              QCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('That ≈ finishing 4 focus tasks.',
                        style: QType.headline),
                    const SizedBox(height: QSpace.xxs),
                    Text('Reclaim it by capping your top distractions.',
                        style: QType.subhead),
                    const SizedBox(height: QSpace.md),
                    PrimaryButton(
                      label: 'Set a limit',
                      icon: CupertinoIcons.timer,
                      style: QButtonStyle.tinted,
                      color: danger,
                      expand: false,
                      height: 44,
                      onPressed: () => _showLimitSheet(context),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: QSpace.md),
              // Hourly bar chart
              _card(
                context,
                'By hour',
                child: SizedBox(
                  height: 130,
                  child: HourlyBarChart(hourly: Mock.hourly, color: danger),
                ),
              ),
              const SizedBox(height: QSpace.md),
              // Category donut
              _card(
                context,
                'Category mix',
                child: const CategoryDonut(
                  // ONE tuned distraction palette: a graduated warm→muted ramp
                  // in the red/danger family, not four unrelated system hues.
                  slices: [
                    CategorySlice(
                        label: 'Social',
                        value: 54,
                        color: CupertinoColors.systemRed),
                    CategorySlice(
                        label: 'Video',
                        value: 38,
                        color: CupertinoColors.systemPink),
                    CategorySlice(
                        label: 'News',
                        value: 15,
                        color: CupertinoColors.systemOrange),
                    CategorySlice(
                        label: 'Other',
                        value: 12,
                        color: CupertinoColors.systemGrey),
                  ],
                ),
              ),
              const SizedBox(height: QSpace.lg),
              // Intervention history entry
              QGroup(
                children: [
                  QRow(
                    icon: CupertinoIcons.bell_fill,
                    label: 'Intervention history',
                    onTap: () {
                      HapticFeedback.selectionClick();
                      Navigator.of(context).push(
                        CupertinoPageRoute(
                            builder: (_) => const InterventionHistoryPage()),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ];
  }

  Widget _iconBadge(IconData icon, Color color) => Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: color),
      );

  void _showLimitSheet(BuildContext context) {
    HapticFeedback.lightImpact();
    showCupertinoModalPopup<void>(
      context: context,
      builder: (ctx) => CupertinoActionSheet(
        title: const Text('Set a daily limit'),
        message: const Text('Choose a cap for your top distraction.'),
        actions: [
          for (final label in ['30 minutes', '1 hour', '2 hours'])
            CupertinoActionSheetAction(
              onPressed: () {
                HapticFeedback.lightImpact();
                Navigator.of(ctx).pop();
              },
              child: Text(label),
            ),
        ],
        cancelButton: CupertinoActionSheetAction(
          isDefaultAction: true,
          onPressed: () => Navigator.of(ctx).pop(),
          child: const Text('Cancel'),
        ),
      ),
    );
  }
}

/// A category breakdown row for the Reports tab.
class _CatRow {
  const _CatRow(this.label, this.valueLabel, this.fraction, this.color);
  final String label;
  final String valueLabel;
  final double fraction;
  final Color color;
}

/// Range-specific mock dataset backing the Reports tab (Day vs Week).
class _ReportData {
  const _ReportData({
    required this.focusSeconds,
    required this.focusDelta,
    required this.focusSpark,
    required this.trend,
    required this.trendLabels,
    required this.tasksDone,
    required this.tasksDelta,
    required this.productivityScore,
    required this.scoreDelta,
    required this.scoreUp,
    required this.avgSession,
    required this.avgDelta,
    required this.avgUp,
    required this.appSwitches,
    required this.switchDelta,
    required this.switchUp,
    required this.topDistraction,
    required this.categories,
  });

  final int focusSeconds;
  final String focusDelta;
  final List<int> focusSpark;
  final List<int> trend;
  final List<String> trendLabels;
  final String tasksDone;
  final String tasksDelta;
  final int productivityScore;
  final String scoreDelta;
  final bool scoreUp;
  final int avgSession;
  final String avgDelta;
  final bool avgUp;
  final int appSwitches;
  final String switchDelta;
  final bool switchUp;
  final AppUsage topDistraction;
  final List<_CatRow> categories;
}
