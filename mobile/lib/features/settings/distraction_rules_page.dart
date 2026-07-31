import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/models/models.dart';
import '../../core/data/mock_data.dart';
import '../../core/widgets/inset_list.dart';
import '../../core/widgets/common.dart';
import 'watched_app_sheet.dart';

/// E2 — Distraction Rules.
class DistractionRulesPage extends StatefulWidget {
  const DistractionRulesPage({super.key});

  @override
  State<DistractionRulesPage> createState() => _DistractionRulesPageState();
}

class _DistractionRulesPageState extends State<DistractionRulesPage> {
  late final List<WatchedApp> _apps =
      Mock.watchedApps.map((w) => WatchedApp(name: w.name, icon: w.icon, graceSeconds: w.graceSeconds)).toList();
  NudgeIntensity _intensity = NudgeIntensity.firm;
  final Set<int> _days = {1, 2, 3, 4, 5}; // Mon-Fri
  int _startMin = 9 * 60;
  int _endMin = 18 * 60;

  static const _dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  String _hm(int min) =>
      '${(min ~/ 60).toString().padLeft(2, '0')}:${(min % 60).toString().padLeft(2, '0')}';

  void _editApp(WatchedApp app) {
    HapticFeedback.selectionClick();
    showWatchedAppSheet(context, existing: app, onSave: (updated) {
      setState(() {
        app.graceSeconds = updated.graceSeconds;
      });
    });
  }

  void _addApp() {
    HapticFeedback.selectionClick();
    showWatchedAppSheet(context, onSave: (created) {
      setState(() => _apps.add(created));
    });
  }

  void _pickTime(bool start) {
    HapticFeedback.selectionClick();
    final initial = start ? _startMin : _endMin;
    showCupertinoModalPopup<void>(
      context: context,
      builder: (ctx) => Container(
        height: 280,
        color: QColors.surface.resolveFrom(ctx),
        child: SafeArea(
          top: false,
          child: CupertinoDatePicker(
            mode: CupertinoDatePickerMode.time,
            use24hFormat: true,
            initialDateTime: DateTime(2026, 1, 1, initial ~/ 60, initial % 60),
            onDateTimeChanged: (d) => setState(() {
              final m = d.hour * 60 + d.minute;
              if (start) {
                _startMin = m;
              } else {
                _endMin = m;
              }
            }),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final brightness = MediaQuery.platformBrightnessOf(context);
    return CupertinoPageScaffold(
      backgroundColor: const Color(0x00000000),
      child: GradientBackground(
        gradient: QGradients.page(brightness),
        child: CustomScrollView(
        slivers: [
          const CupertinoSliverNavigationBar(
              previousPageTitle: 'You',
              largeTitle: Text('Distraction Rules'),
              backgroundColor: Color(0x00000000),
              border: null),
          SliverList(
            delegate: SliverChildListDelegate([
              const SizedBox(height: QSpace.xs),
              InsetSection(
                header: 'Watched Apps',
                footer:
                    'A gentle nudge appears after the grace period when you open a watched app during focus hours.',
                children: [
                  for (final app in _apps)
                    InsetRow(
                      icon: app.icon,
                      iconColor: QColors.breakColor,
                      title: app.name,
                      value: fmtHm(app.graceSeconds).replaceAll(' ', ''),
                      onTap: () => _editApp(app),
                    ),
                  InsetRow(
                    icon: CupertinoIcons.add,
                    iconColor: QColors.breakColor,
                    title: 'Add app',
                    showChevron: false,
                    onTap: _addApp,
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xl),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    QSpace.md + QSpace.xs, 0, QSpace.md + QSpace.xs, QSpace.xs),
                child: Text('NUDGE INTENSITY', style: QType.sectionHeader),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
                child: CupertinoSlidingSegmentedControl<NudgeIntensity>(
                  groupValue: _intensity,
                  onValueChanged: (v) {
                    if (v == null) return;
                    HapticFeedback.selectionClick();
                    setState(() => _intensity = v);
                  },
                  children: const {
                    NudgeIntensity.gentle: Padding(
                        padding: EdgeInsets.symmetric(vertical: 6),
                        child: Text('Gentle')),
                    NudgeIntensity.firm: Text('Firm'),
                    NudgeIntensity.toughLove: Text('Tough-love'),
                  },
                ),
              ),
              const SizedBox(height: QSpace.xl),
              InsetSection(
                header: 'Schedule',
                children: [
                  InsetRow(
                    icon: CupertinoIcons.clock_fill,
                    iconColor: QColors.breakColor,
                    title: 'Focus hours',
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _TimeChip(label: _hm(_startMin), onTap: () => _pickTime(true)),
                        const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 6),
                            child: Text('–')),
                        _TimeChip(label: _hm(_endMin), onTap: () => _pickTime(false)),
                      ],
                    ),
                    showChevron: false,
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                        QSpace.md, QSpace.sm, QSpace.md, QSpace.sm),
                    child: Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: QColors.wellbeing.resolveFrom(context),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Icon(CupertinoIcons.calendar,
                              size: 17, color: CupertinoColors.white),
                        ),
                        const SizedBox(width: QSpace.sm),
                        Text('Days', style: QType.body),
                        const Spacer(),
                        for (var i = 0; i < 7; i++)
                          _DayDot(
                            label: _dayLabels[i],
                            active: _days.contains(i),
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() => _days.contains(i)
                                  ? _days.remove(i)
                                  : _days.add(i));
                            },
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xxl),
            ]),
          ),
        ],
        ),
      ),
    );
  }
}

class _TimeChip extends StatelessWidget {
  const _TimeChip({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 5),
        decoration: BoxDecoration(
          color: QColors.fill.resolveFrom(context),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(label,
            style: QType.subhead.copyWith(
                color: QColors.breakColor.resolveFrom(context),
                fontFeatures: const [FontFeature.tabularFigures()])),
      ),
    );
  }
}

class _DayDot extends StatelessWidget {
  const _DayDot(
      {required this.label, required this.active, required this.onTap});
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tint = QColors.breakColor.resolveFrom(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(left: 5),
        width: 26,
        height: 26,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: active ? tint : QColors.fill.resolveFrom(context),
        ),
        child: Text(label,
            style: QType.caption.copyWith(
                fontWeight: FontWeight.w600,
                color: active
                    ? CupertinoColors.white
                    : QColors.labelSecondary.resolveFrom(context))),
      ),
    );
  }
}
