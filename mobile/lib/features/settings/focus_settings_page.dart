import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/models/models.dart';
import '../../core/widgets/inset_list.dart';

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
      builder: (ctx) => Container(
        height: 260,
        color: QColors.surface.resolveFrom(ctx),
        child: SafeArea(
          top: false,
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
    );
  }

  Widget _stepperRow(
      {required IconData icon,
      required Color color,
      required String title,
      required String value,
      required VoidCallback onMinus,
      required VoidCallback onPlus}) {
    return InsetRow(
      icon: icon,
      iconColor: color,
      title: title,
      showChevron: false,
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
    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: CustomScrollView(
        slivers: [
          const CupertinoSliverNavigationBar(
              previousPageTitle: 'You', largeTitle: Text('Focus & Pomodoro')),
          SliverList(
            delegate: SliverChildListDelegate([
              const SizedBox(height: QSpace.xs),
              InsetSection(
                header: 'Session',
                children: [
                  InsetRow(
                    icon: _defaultType.icon,
                    iconColor: QColors.focus,
                    title: 'Default session',
                    value: _defaultType.label,
                    onTap: _pickDefaultType,
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xl),
              InsetSection(
                header: 'Pomodoro',
                footer: 'Applies to Pomodoro sessions. A long break follows every $_cycles cycles.',
                children: [
                  _stepperRow(
                    icon: CupertinoIcons.timer,
                    color: QColors.focus,
                    title: 'Work',
                    value: '$_work min',
                    onMinus: () => setState(() => _work = (_work - 5).clamp(5, 90)),
                    onPlus: () => setState(() => _work = (_work + 5).clamp(5, 90)),
                  ),
                  _stepperRow(
                    icon: CupertinoIcons.pause_circle,
                    color: QColors.breakColor,
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
                ],
              ),
              const SizedBox(height: QSpace.xl),
              InsetSection(
                header: 'Goals & Alerts',
                children: [
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
                  InsetRow(
                    icon: CupertinoIcons.speaker_2_fill,
                    iconColor: QColors.tint,
                    title: 'Alert sound',
                    showChevron: false,
                    trailing: CupertinoSwitch(
                      value: _alertSound,
                      onChanged: (v) {
                        HapticFeedback.selectionClick();
                        setState(() => _alertSound = v);
                      },
                    ),
                  ),
                  InsetRow(
                    icon: CupertinoIcons.textformat,
                    iconColor: QColors.workspacePalette[5],
                    title: 'Scrolling title',
                    showChevron: false,
                    trailing: CupertinoSwitch(
                      value: _scrollingTitle,
                      onChanged: (v) {
                        HapticFeedback.selectionClick();
                        setState(() => _scrollingTitle = v);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xxl),
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
    Widget btn(IconData icon, VoidCallback onTap) => GestureDetector(
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
