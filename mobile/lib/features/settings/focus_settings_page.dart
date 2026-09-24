import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/models/models.dart';
import '../../core/widgets/app_kit.dart';
import '../../core/widgets/editorial.dart';
import 'settings_widgets.dart';

/// E4 — Focus & Pomodoro settings.
class FocusSettingsPage extends StatefulWidget {
  const FocusSettingsPage({super.key});

  @override
  State<FocusSettingsPage> createState() => _FocusSettingsPageState();
}

class _FocusSettingsPageState extends State<FocusSettingsPage> {
  SessionType _defaultType = SessionType.pomodoro;
  int _work = 25;
  int _brk = 5;
  int _longBreak = 15;
  int _cycles = 4;
  int _dailyGoalMin = 180;
  int _alertInterval = 10;
  bool _alertSound = true;
  bool _scrollingTitle = true;

  void _pickDefaultType() {
    HapticFeedback.selectionClick();
    showCupertinoModalPopup<void>(
      context: context,
      builder: (ctx) => SettingsSheet(
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 240,
            child: CupertinoPicker(
              itemExtent: 40,
              scrollController: FixedExtentScrollController(
                  initialItem: SessionType.values.indexOf(_defaultType)),
              onSelectedItemChanged: (i) =>
                  setState(() => _defaultType = SessionType.values[i]),
              children: [
                for (final t in SessionType.values)
                  Center(child: Text(t.label, style: QType.body)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _stepperRow(
      {required IconData icon,
      required Color color,
      required String title,
      required String value,
      required VoidCallback onMinus,
      required VoidCallback onPlus}) {
    return SettingsRow(
      icon: icon,
      iconColor: color,
      title: title,
      chevron: false,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(value,
              style: QType.body.copyWith(
                  color: QColors.labelSecondary.resolveFrom(context),
                  fontFeatures: const [FontFeature.tabularFigures()])),
          const SizedBox(width: QSpace.sm),
          _MiniStepper(onMinus: onMinus, onPlus: onPlus),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SettingsAmbientBackground(
      child: AppScaffold(
      title: 'Focus & Pomodoro',
      backgroundColor: const Color(0x00000000),
      transitionBetweenRoutes: true,
      slivers: [
        SliverPagePadding(
          top: QSpace.xs,
          child: QStagger(children: [
              const QSectionHeader(label: 'Session'),
              FrostedGroup(children: [
                SettingsRow(
                  icon: _defaultType.icon,
                  iconColor: QColors.breakColor,
                  title: 'Default session',
                  value: _defaultType.label,
                  onTap: _pickDefaultType,
                ),
              ]),
              const SizedBox(height: QSpace.xl),
              const QSectionHeader(label: 'Pomodoro'),
              FrostedGroup(children: [
                  _stepperRow(
                    icon: CupertinoIcons.timer,
                    color: QColors.breakColor,
                    title: 'Work',
                    value: '$_work min',
                    onMinus: () => setState(() => _work = (_work - 5).clamp(5, 90)),
                    onPlus: () => setState(() => _work = (_work + 5).clamp(5, 90)),
                  ),
                  _stepperRow(
                    icon: CupertinoIcons.pause_circle,
                    color: QColors.warn,
                    title: 'Short break',
                    value: '$_brk min',
                    onMinus: () => setState(() => _brk = (_brk - 1).clamp(1, 30)),
                    onPlus: () => setState(() => _brk = (_brk + 1).clamp(1, 30)),
                  ),
                  _stepperRow(
                    icon: CupertinoIcons.moon_zzz,
                    color: QColors.workspacePalette[2],
                    title: 'Long break',
                    value: '$_longBreak min',
                    onMinus: () => setState(() => _longBreak = (_longBreak - 5).clamp(5, 45)),
                    onPlus: () => setState(() => _longBreak = (_longBreak + 5).clamp(5, 45)),
                  ),
                  _stepperRow(
                    icon: CupertinoIcons.repeat,
                    color: QColors.wellbeing,
                    title: 'Cycles',
                    value: '$_cycles',
                    onMinus: () => setState(() => _cycles = (_cycles - 1).clamp(2, 8)),
                    onPlus: () => setState(() => _cycles = (_cycles + 1).clamp(2, 8)),
                  ),
                ]),
              SettingsFootnote(
                  'Applies to Pomodoro sessions. A long break follows every $_cycles cycles.'),
              const SizedBox(height: QSpace.xl),
              const QSectionHeader(label: 'Goals & alerts'),
              FrostedGroup(children: [
                  _stepperRow(
                    icon: CupertinoIcons.flag_fill,
                    color: QColors.warn,
                    title: 'Daily goal',
                    value: '${_dailyGoalMin ~/ 60}h ${_dailyGoalMin % 60}m',
                    onMinus: () => setState(() => _dailyGoalMin = (_dailyGoalMin - 30).clamp(30, 720)),
                    onPlus: () => setState(() => _dailyGoalMin = (_dailyGoalMin + 30).clamp(30, 720)),
                  ),
                  _stepperRow(
                    icon: CupertinoIcons.bell,
                    color: QColors.danger,
                    title: 'Alert interval',
                    value: '$_alertInterval min',
                    onMinus: () => setState(() => _alertInterval = (_alertInterval - 5).clamp(5, 60)),
                    onPlus: () => setState(() => _alertInterval = (_alertInterval + 5).clamp(5, 60)),
                  ),
                  SettingsSwitchRow(
                    icon: CupertinoIcons.speaker_2_fill,
                    iconColor: QColors.breakColor,
                    title: 'Alert sound',
                    value: _alertSound,
                    onChanged: (v) => setState(() => _alertSound = v),
                  ),
                  SettingsSwitchRow(
                    icon: CupertinoIcons.textformat,
                    iconColor: QColors.workspacePalette[5],
                    title: 'Scrolling title',
                    value: _scrollingTitle,
                    onChanged: (v) => setState(() => _scrollingTitle = v),
                  ),
                ]),
              ]),
        ),
      ],
    ),
    );
  }
}

class _MiniStepper extends StatelessWidget {
  const _MiniStepper({required this.onMinus, required this.onPlus});
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    Widget btn(IconData icon, VoidCallback onTap) => Pressable(
          pressedScale: 0.9,
          onTap: () {
            HapticFeedback.selectionClick();
            onTap();
          },
          child: Container(
            width: 38,
            height: 28,
            alignment: Alignment.center,
            color: QColors.fill.resolveFrom(context),
            child: Icon(icon, size: 17, color: QColors.label.resolveFrom(context)),
          ),
        );
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        btn(CupertinoIcons.minus, onMinus),
        Container(width: 0.5, height: 28, color: QColors.separator.resolveFrom(context)),
        btn(CupertinoIcons.plus, onPlus),
      ]),
    );
  }
}
