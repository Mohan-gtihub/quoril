import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Pomodoro configuration carried out of the session type sheet.
class PomodoroConfig {
  const PomodoroConfig({this.workMinutes = 25, this.breakMinutes = 5, this.cycles = 4});
  final int workMinutes;
  final int breakMinutes;
  final int cycles;

  PomodoroConfig copyWith({int? workMinutes, int? breakMinutes, int? cycles}) => PomodoroConfig(
        workMinutes: workMinutes ?? this.workMinutes,
        breakMinutes: breakMinutes ?? this.breakMinutes,
        cycles: cycles ?? this.cycles,
      );
}

/// Result returned from [showSessionTypeSheet].
class SessionTypeResult {
  const SessionTypeResult(this.type, this.pomodoro);
  final SessionType type;
  final PomodoroConfig pomodoro;
}

String sessionTypeSubtitle(SessionType t) => switch (t) {
      SessionType.regular => 'Open-ended timer, no target',
      SessionType.deepWork => '90 minutes, distractions blocked',
      SessionType.quickSprint => '15 minute burst',
      SessionType.pomodoro => 'Work / break intervals',
    };

Future<SessionTypeResult?> showSessionTypeSheet(
  BuildContext context, {
  required SessionType selected,
  required PomodoroConfig pomodoro,
}) {
  return showCupertinoModalPopup<SessionTypeResult>(
    context: context,
    builder: (_) => _SessionTypeSheet(selected: selected, pomodoro: pomodoro),
  );
}

class _SessionTypeSheet extends StatefulWidget {
  const _SessionTypeSheet({required this.selected, required this.pomodoro});
  final SessionType selected;
  final PomodoroConfig pomodoro;

  @override
  State<_SessionTypeSheet> createState() => _SessionTypeSheetState();
}

class _SessionTypeSheetState extends State<_SessionTypeSheet> {
  late SessionType _type = widget.selected;
  late PomodoroConfig _pomo = widget.pomodoro;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: QColors.bgGrouped.resolveFrom(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(QRadius.glass)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, QSpace.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 5,
                  decoration: BoxDecoration(
                    color: QColors.separator.resolveFrom(context),
                    borderRadius: BorderRadius.circular(QRadius.capsule),
                  ),
                ),
              ),
              const SizedBox(height: QSpace.md),
              Text('Session Type', style: QType.title3),
              const SizedBox(height: QSpace.md),
              Container(
                decoration: BoxDecoration(
                  color: QColors.surface.resolveFrom(context),
                  borderRadius: BorderRadius.circular(QRadius.card),
                ),
                child: Column(
                  children: [
                    for (final t in SessionType.values) ...[
                      if (t != SessionType.values.first)
                        Padding(
                          padding: const EdgeInsets.only(left: 52),
                          child: Container(
                            height: 0.5,
                            color: QColors.separator.resolveFrom(context),
                          ),
                        ),
                      _TypeRow(
                        type: t,
                        selected: _type == t,
                        onTap: () {
                          HapticFeedback.selectionClick();
                          setState(() => _type = t);
                        },
                      ),
                    ],
                  ],
                ),
              ),
              if (_type == SessionType.pomodoro) ...[
                const SizedBox(height: QSpace.md),
                _PomodoroSteppers(
                  config: _pomo,
                  onChanged: (c) => setState(() => _pomo = c),
                ),
              ],
              const SizedBox(height: QSpace.lg),
              SizedBox(
                width: double.infinity,
                child: CupertinoButton.filled(
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    Navigator.of(context).pop(SessionTypeResult(_type, _pomo));
                  },
                  child: const Text('Set Type'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TypeRow extends StatelessWidget {
  const _TypeRow({required this.type, required this.selected, required this.onTap});
  final SessionType type;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tint = QColors.focus.resolveFrom(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.sm),
        child: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: tint.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(type.icon, size: 17, color: tint),
            ),
            const SizedBox(width: QSpace.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(type.label, style: QType.body),
                  const SizedBox(height: 1),
                  Text(sessionTypeSubtitle(type), style: QType.footnote),
                ],
              ),
            ),
            if (selected)
              Icon(CupertinoIcons.checkmark_circle_fill, color: tint, size: 22)
            else
              Icon(
                CupertinoIcons.circle,
                color: QColors.labelTertiary.resolveFrom(context),
                size: 22,
              ),
          ],
        ),
      ),
    );
  }
}

class _PomodoroSteppers extends StatelessWidget {
  const _PomodoroSteppers({required this.config, required this.onChanged});
  final PomodoroConfig config;
  final ValueChanged<PomodoroConfig> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.card),
      ),
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.xs),
      child: Column(
        children: [
          _StepperRow(
            label: 'Work',
            value: '${config.workMinutes} min',
            onDec: config.workMinutes > 5
                ? () => onChanged(config.copyWith(workMinutes: config.workMinutes - 5))
                : null,
            onInc: config.workMinutes < 60
                ? () => onChanged(config.copyWith(workMinutes: config.workMinutes + 5))
                : null,
          ),
          _divider(context),
          _StepperRow(
            label: 'Break',
            value: '${config.breakMinutes} min',
            onDec: config.breakMinutes > 1
                ? () => onChanged(config.copyWith(breakMinutes: config.breakMinutes - 1))
                : null,
            onInc: config.breakMinutes < 30
                ? () => onChanged(config.copyWith(breakMinutes: config.breakMinutes + 1))
                : null,
          ),
          _divider(context),
          _StepperRow(
            label: 'Cycles',
            value: '${config.cycles}',
            onDec: config.cycles > 1
                ? () => onChanged(config.copyWith(cycles: config.cycles - 1))
                : null,
            onInc: config.cycles < 8
                ? () => onChanged(config.copyWith(cycles: config.cycles + 1))
                : null,
          ),
        ],
      ),
    );
  }

  Widget _divider(BuildContext context) =>
      Container(height: 0.5, color: QColors.separator.resolveFrom(context));
}

class _StepperRow extends StatelessWidget {
  const _StepperRow({
    required this.label,
    required this.value,
    required this.onDec,
    required this.onInc,
  });
  final String label;
  final String value;
  final VoidCallback? onDec;
  final VoidCallback? onInc;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: QSpace.xs),
      child: Row(
        children: [
          Expanded(child: Text(label, style: QType.body)),
          Text(value, style: QType.body.copyWith(color: QColors.labelSecondary.resolveFrom(context))),
          const SizedBox(width: QSpace.sm),
          CupertinoButton(
            padding: EdgeInsets.zero,
            minSize: 30,
            onPressed: onDec == null
                ? null
                : () {
                    HapticFeedback.selectionClick();
                    onDec!();
                  },
            child: const Icon(CupertinoIcons.minus_circle_fill, size: 26),
          ),
          CupertinoButton(
            padding: EdgeInsets.zero,
            minSize: 30,
            onPressed: onInc == null
                ? null
                : () {
                    HapticFeedback.selectionClick();
                    onInc!();
                  },
            child: const Icon(CupertinoIcons.plus_circle_fill, size: 26),
          ),
        ],
      ),
    );
  }
}
