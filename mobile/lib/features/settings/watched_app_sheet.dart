import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/models/models.dart';
import '../../core/widgets/primary_button.dart';

/// E3 — Add/Edit Watched App sheet.
Future<void> showWatchedAppSheet(
  BuildContext context, {
  WatchedApp? existing,
  required ValueChanged<WatchedApp> onSave,
}) {
  return showCupertinoModalPopup<void>(
    context: context,
    builder: (_) => _WatchedAppSheet(existing: existing, onSave: onSave),
  );
}

class _WatchedAppSheet extends StatefulWidget {
  const _WatchedAppSheet({this.existing, required this.onSave});
  final WatchedApp? existing;
  final ValueChanged<WatchedApp> onSave;

  @override
  State<_WatchedAppSheet> createState() => _WatchedAppSheetState();
}

class _WatchedAppSheetState extends State<_WatchedAppSheet> {
  late final TextEditingController _name =
      TextEditingController(text: widget.existing?.name ?? '');
  late int _grace = widget.existing?.graceSeconds ?? 120;
  NudgeIntensity _override = NudgeIntensity.firm;
  bool _limitOn = false;
  int _limitMin = 30;

  static const _graceSteps = [30, 60, 120, 300, 600];

  String _graceLabel(int s) => s < 60 ? '${s}s' : '${s ~/ 60}m';

  void _stepGrace(int dir) {
    final idx = _graceSteps.indexOf(_grace);
    final ni = (idx + dir).clamp(0, _graceSteps.length - 1);
    if (ni == idx) return;
    HapticFeedback.selectionClick();
    setState(() => _grace = _graceSteps[ni]);
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final editing = widget.existing != null;
    return Container(
      decoration: BoxDecoration(
        gradient: QGradients.page(MediaQuery.platformBrightnessOf(context)),
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
                  margin: const EdgeInsets.only(bottom: QSpace.md),
                  decoration: BoxDecoration(
                    color: QColors.separator.resolveFrom(context),
                    borderRadius: BorderRadius.circular(QRadius.capsule),
                  ),
                ),
              ),
              Text(editing ? 'Edit Watched App' : 'Add Watched App',
                  style: QType.title3, textAlign: TextAlign.center),
              const SizedBox(height: QSpace.lg),
              CupertinoTextField(
                controller: _name,
                placeholder: 'App name',
                padding: const EdgeInsets.all(QSpace.sm),
                decoration: BoxDecoration(
                  color: QColors.surface.resolveFrom(context),
                  borderRadius: BorderRadius.circular(QRadius.row),
                ),
              ),
              const SizedBox(height: QSpace.md),
              _Card(
                child: Row(
                  children: [
                    Text('Grace period', style: QType.body),
                    const Spacer(),
                    Text(_graceLabel(_grace),
                        style: QType.body.copyWith(
                            color: QColors.labelSecondary.resolveFrom(context),
                            fontFeatures: const [FontFeature.tabularFigures()])),
                    const SizedBox(width: QSpace.sm),
                    _Stepper(onMinus: () => _stepGrace(-1), onPlus: () => _stepGrace(1)),
                  ],
                ),
              ),
              const SizedBox(height: QSpace.md),
              CupertinoSlidingSegmentedControl<NudgeIntensity>(
                groupValue: _override,
                onValueChanged: (v) {
                  if (v == null) return;
                  HapticFeedback.selectionClick();
                  setState(() => _override = v);
                },
                children: const {
                  NudgeIntensity.gentle: Padding(
                      padding: EdgeInsets.symmetric(vertical: 6),
                      child: Text('Gentle')),
                  NudgeIntensity.firm: Text('Firm'),
                  NudgeIntensity.toughLove: Text('Tough'),
                },
              ),
              const SizedBox(height: QSpace.md),
              _Card(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Text('Daily limit', style: QType.body),
                        const Spacer(),
                        CupertinoSwitch(
                          value: _limitOn,
                          onChanged: (v) {
                            HapticFeedback.selectionClick();
                            setState(() => _limitOn = v);
                          },
                        ),
                      ],
                    ),
                    if (_limitOn) ...[
                      Container(
                          height: 0.5,
                          margin: const EdgeInsets.symmetric(vertical: QSpace.sm),
                          color: QColors.separator.resolveFrom(context)),
                      Row(
                        children: [
                          Text('Minutes / day', style: QType.body),
                          const Spacer(),
                          Text('$_limitMin m',
                              style: QType.body.copyWith(
                                  color: QColors.labelSecondary.resolveFrom(context))),
                          const SizedBox(width: QSpace.sm),
                          _Stepper(
                            onMinus: () {
                              HapticFeedback.selectionClick();
                              setState(() => _limitMin = (_limitMin - 15).clamp(15, 240));
                            },
                            onPlus: () {
                              HapticFeedback.selectionClick();
                              setState(() => _limitMin = (_limitMin + 15).clamp(15, 240));
                            },
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: QSpace.lg),
              PrimaryButton(
                label: 'Save',
                onPressed: () {
                  HapticFeedback.lightImpact();
                  final name = _name.text.trim().isEmpty
                      ? (widget.existing?.name ?? 'New App')
                      : _name.text.trim();
                  widget.onSave(WatchedApp(
                    name: name,
                    icon: widget.existing?.icon ?? CupertinoIcons.app_badge,
                    graceSeconds: _grace,
                  ));
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(QSpace.md),
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.card),
      ),
      child: child,
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({required this.onMinus, required this.onPlus});
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    Widget btn(IconData icon, VoidCallback onTap) => GestureDetector(
          onTap: onTap,
          child: Container(
            width: 40,
            height: 30,
            alignment: Alignment.center,
            color: QColors.fill.resolveFrom(context),
            child: Icon(icon, size: 18, color: QColors.label.resolveFrom(context)),
          ),
        );
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        btn(CupertinoIcons.minus, onMinus),
        Container(width: 0.5, height: 30, color: QColors.separator.resolveFrom(context)),
        btn(CupertinoIcons.plus, onPlus),
      ]),
    );
  }
}
