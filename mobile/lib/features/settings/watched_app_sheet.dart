import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/models/models.dart';
import '../../core/widgets/editorial.dart';
import '../../core/widgets/primary_button.dart';
import 'settings_widgets.dart';

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
    return SettingsSheet(
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xs, QSpace.md, QSpace.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(editing ? 'Edit watched app' : 'Add watched app',
                  style: QType.title2, textAlign: TextAlign.center),
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
              QCard(
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
              // NOTE: per-app nudge-override and daily-limit controls were
              // removed — the WatchedApp model (lib/core) carries only
              // name/icon/graceSeconds, so those inputs would be silently
              // discarded on save. Reinstate them once the model can persist
              // them, rather than shipping dead controls.
              const SizedBox(height: QSpace.lg),
              PrimaryButton(
                label: editing ? 'Save changes' : 'Add app',
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

class _Stepper extends StatelessWidget {
  const _Stepper({required this.onMinus, required this.onPlus});
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    Widget btn(IconData icon, VoidCallback onTap) => Pressable(
          pressedScale: 0.9,
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
