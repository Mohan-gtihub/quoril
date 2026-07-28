import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/data/mock_data.dart';
import '../../core/models/models.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/inset_list.dart';
import '../../core/widgets/primary_button.dart';
import 'app_detail_page.dart';
import 'intervention_history_page.dart';
import 'widgets/charts.dart';
import 'widgets/kpi_card.dart';

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
    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        slivers: [
          const CupertinoSliverNavigationBar(largeTitle: Text('Insights')),
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

  // ------------------------------------------------------------- CONTROLS
  Widget _controls(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, QSpace.xs),
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: CupertinoSlidingSegmentedControl<_Tab>(
              groupValue: _tab,
              onValueChanged: (v) {
                if (v == null) return;
                HapticFeedback.selectionClick();
                setState(() => _tab = v);
              },
              children: const {
                _Tab.reports: Padding(
                  padding: EdgeInsets.symmetric(vertical: 6),
                  child: Text('Reports'),
                ),
                _Tab.screenTime: Padding(
                  padding: EdgeInsets.symmetric(vertical: 6),
                  child: Text('Screen Time'),
                ),
              },
            ),
          ),
          const SizedBox(height: QSpace.sm),
          CupertinoSlidingSegmentedControl<_Range>(
            groupValue: _range,
            onValueChanged: (v) {
              if (v == null) return;
              HapticFeedback.selectionClick();
              setState(() => _range = v);
            },
            children: const {
              _Range.day: Padding(
                padding: EdgeInsets.symmetric(horizontal: 22, vertical: 5),
                child: Text('Day'),
              ),
              _Range.week: Padding(
                padding: EdgeInsets.symmetric(horizontal: 22, vertical: 5),
                child: Text('Week'),
              ),
            },
          ),
        ],
      ),
    );
  }

  // Section wrapper: grouped card with headline + optional trailing.
  Widget _card(BuildContext context, String title,
      {String? trailing, required Widget child}) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(title, style: QType.headline),
              const Spacer(),
              if (trailing != null) Text(trailing, style: QType.footnote),
            ],
          ),
          const SizedBox(height: QSpace.md),
          child,
        ],
      ),
    );
  }

  Widget _pad(Widget child, {double top = QSpace.md}) => Padding(
        padding: EdgeInsets.fromLTRB(QSpace.md, top, QSpace.md, 0),
        child: child,
      );

  // ---------------------------------------------------------------- REPORTS
  List<Widget> _reports(BuildContext context) {
    final isDay = _range == _Range.day;
    final avgSession = Mock.recentSessions.isEmpty
        ? 0
        : Mock.recentSessions
                .map((s) => s.durationSeconds)
                .reduce((a, b) => a + b) ~/
            Mock.recentSessions.length;

    final kpis = <Widget>[
      KpiCard(
        value: fmtHm(Mock.focusTodaySeconds),
        label: 'Focus Time',
        delta: '18% vs avg',
        deltaUp: true,
        icon: CupertinoIcons.timer,
      ),
      const KpiCard(
        value: '8/11',
        label: 'Tasks Done',
        delta: '2 more',
        deltaUp: true,
        icon: CupertinoIcons.checkmark_circle,
      ),
      KpiCard(
        value: '${Mock.productivityScore}%',
        label: 'Productivity Score',
        delta: '5 pts',
        deltaUp: true,
        valueColor: QColors.tint,
        icon: CupertinoIcons.gauge,
      ),
      KpiCard(
        value: fmtHm(avgSession),
        label: 'Avg Session',
        delta: '4m longer',
        deltaUp: true,
        icon: CupertinoIcons.circle_grid_hex,
      ),
      const KpiCard(
        value: '31',
        label: 'App Switches',
        delta: '12 fewer',
        deltaUp: true,
        icon: CupertinoIcons.arrow_2_squarepath,
      ),
      const KpiCard(
        value: 'Instagram',
        label: 'Top Distraction',
        delta: '54m today',
        deltaUp: false,
        valueColor: QColors.danger,
        icon: CupertinoIcons.exclamationmark_triangle,
      ),
    ];

    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, 0),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: QSpace.sm,
            mainAxisSpacing: QSpace.sm,
            childAspectRatio: 1.55,
          ),
          delegate: SliverChildListDelegate(kpis),
        ),
      ),
      SliverToBoxAdapter(
        child: _pad(
          _card(
            context,
            'Performance',
            trailing: isDay ? 'Today' : 'This week',
            child: SizedBox(
              height: 150,
              child: TrendLineChart(values: Mock.weekTrend),
            ),
          ),
          top: QSpace.lg,
        ),
      ),
      SliverToBoxAdapter(
        child: _pad(
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Category breakdown', style: QType.headline),
                const SizedBox(height: QSpace.xs),
                HBarRow(
                  label: 'Deep Work',
                  valueLabel: '2h 12m',
                  fraction: 1.0,
                  color: QColors.tint.resolveFrom(context),
                ),
                HBarRow(
                  label: 'Design',
                  valueLabel: '1h 28m',
                  fraction: 0.66,
                  color: CupertinoDynamicColor.resolve(
                      QColors.workspacePalette[5], context),
                ),
                HBarRow(
                  label: 'Meetings',
                  valueLabel: '42m',
                  fraction: 0.32,
                  color: QColors.breakColor.resolveFrom(context),
                ),
                HBarRow(
                  label: 'Admin',
                  valueLabel: '25m',
                  fraction: 0.19,
                  color: QColors.labelSecondary.resolveFrom(context),
                ),
              ],
            ),
          ),
        ),
      ),
      SliverToBoxAdapter(
        child: _pad(
          GlassCard(
            child: Row(
              children: [
                _iconBadge(
                    CupertinoIcons.scope, QColors.wellbeing.resolveFrom(context)),
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
                              fontFeatures: const [FontFeature.tabularFigures()],
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
      // Verdict
      SliverToBoxAdapter(
        child: _pad(
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Today you lost', style: QType.subhead),
                const SizedBox(height: 2),
                Text(
                  fmtHm(Mock.lostToDistractionSeconds),
                  style: QType.largeTitle.copyWith(
                    color: danger,
                    letterSpacing: -1,
                    fontSize: 44,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
                const SizedBox(height: 2),
                Text('to distractions', style: QType.subhead),
                const SizedBox(height: QSpace.sm),
                Row(
                  children: [
                    Icon(CupertinoIcons.arrow_down, size: 14, color: green),
                    const SizedBox(width: 4),
                    Text(
                      '22m better than your average',
                      style: QType.footnote
                          .copyWith(color: green, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ],
            ),
          ),
          top: QSpace.sm,
        ),
      ),
      // Where it went
      SliverToBoxAdapter(
        child: _pad(
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Where it went', style: QType.headline),
                const SizedBox(height: QSpace.xs),
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
        ),
      ),
      // Win card
      SliverToBoxAdapter(
        child: _pad(
          GlassCard(
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
                              size: 13, color: QColors.breakColor.resolveFrom(context)),
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
        ),
      ),
      // Cost translation
      SliverToBoxAdapter(
        child: _pad(
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('That ≈ finishing 4 focus tasks.', style: QType.headline),
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
        ),
      ),
      // Hourly bar chart
      SliverToBoxAdapter(
        child: _pad(
          _card(
            context,
            'By hour',
            child: SizedBox(
              height: 130,
              child: HourlyBarChart(hourly: Mock.hourly, color: danger),
            ),
          ),
        ),
      ),
      // Category donut
      SliverToBoxAdapter(
        child: _pad(
          _card(
            context,
            'Category mix',
            child: const CategoryDonut(
              slices: [
                CategorySlice(
                    label: 'Social', value: 54, color: CupertinoColors.systemRed),
                CategorySlice(
                    label: 'Video',
                    value: 38,
                    color: CupertinoColors.systemOrange),
                CategorySlice(
                    label: 'News',
                    value: 15,
                    color: CupertinoColors.systemYellow),
                CategorySlice(
                    label: 'Other',
                    value: 12,
                    color: CupertinoColors.systemGrey),
              ],
            ),
          ),
        ),
      ),
      // Intervention history entry
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.only(top: QSpace.lg),
          child: InsetSection(
            children: [
              InsetRow(
                icon: CupertinoIcons.bell_fill,
                iconColor: QColors.tint,
                title: 'Intervention history',
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
