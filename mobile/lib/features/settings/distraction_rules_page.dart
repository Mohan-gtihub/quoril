import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/models/models.dart';
import '../../core/data/mock_data.dart';
import '../../core/widgets/app_kit.dart';
import '../../core/widgets/editorial.dart';
import '../../core/widgets/common.dart';
import 'settings_widgets.dart';
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
    // Draft the value locally; only commit on Done.
    var draft = initial;
    showCupertinoModalPopup<void>(
      context: context,
      builder: (ctx) => SheetPickerScaffold(
        title: start ? 'Start time' : 'End time',
        onCancel: () => Navigator.pop(ctx),
        onDone: () {
          HapticFeedback.selectionClick();
          setState(() {
            if (start) {
              _startMin = draft;
            } else {
              _endMin = draft;
            }
          });
          Navigator.pop(ctx);
        },
        child: CupertinoDatePicker(
          mode: CupertinoDatePickerMode.time,
          use24hFormat: true,
          initialDateTime: DateTime(2026, 1, 1, initial ~/ 60, initial % 60),
          onDateTimeChanged: (d) => draft = d.hour * 60 + d.minute,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SettingsAmbientBackground(
      child: AppScaffold(
      title: 'Distraction Rules',
      backgroundColor: const Color(0x00000000),
      transitionBetweenRoutes: true,
      slivers: [
        SliverPagePadding(
          top: QSpace.xs,
          child: QStagger(children: [
              const QSectionHeader(label: 'Watched apps'),
              FrostedGroup(children: [
                for (final app in _apps)
                  SettingsRow(
                    icon: app.icon,
                    iconColor: QColors.breakColor,
                    title: app.name,
                    value: fmtHm(app.graceSeconds).replaceAll(' ', ''),
                    onTap: () => _editApp(app),
                  ),
                SettingsRow(
                  icon: CupertinoIcons.add,
                  iconColor: QColors.breakColor,
                  title: 'Add app',
                  chevron: false,
                  onTap: _addApp,
                ),
              ]),
              const SettingsFootnote(
                  'A gentle nudge appears after the grace period when you open a watched app during focus hours.'),
              const SizedBox(height: QSpace.xl),
              const QSectionHeader(label: 'Nudge intensity'),
              QSegmentedControl<NudgeIntensity>(
                groupValue: _intensity,
                accent: QSection.settings,
                onValueChanged: (v) {
                  if (v == null) return;
                  HapticFeedback.selectionClick();
                  setState(() => _intensity = v);
                },
                children: const {
                  NudgeIntensity.gentle: Text('Gentle'),
                  NudgeIntensity.firm: Text('Firm'),
                  NudgeIntensity.toughLove: Text('Tough-love'),
                },
              ),
              const SizedBox(height: QSpace.xl),
              const QSectionHeader(label: 'Schedule'),
              FrostedGroup(children: [
                  SettingsRow(
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
                    chevron: false,
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                        QSpace.md, QSpace.sm, QSpace.md, QSpace.sm),
                    child: Row(
                      children: [
                        QIconTile(
                            icon: CupertinoIcons.calendar,
                            color: QColors.wellbeing),
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
                ]),
              ]),
        ),
      ],
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
    return Pressable(
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
