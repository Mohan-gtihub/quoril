import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';
import '../../core/widgets/editorial.dart';
import 'settings_widgets.dart';

/// E5 — Notifications.
class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  bool _authorized = true;
  bool _nudges = true;
  bool _sessionComplete = true;
  bool _sound = true;
  bool _quietHours = false;
  int _quietStart = 22 * 60;
  int _quietEnd = 7 * 60;

  String _hm(int m) =>
      '${(m ~/ 60).toString().padLeft(2, '0')}:${(m % 60).toString().padLeft(2, '0')}';

  void _pickQuiet(bool start) {
    HapticFeedback.selectionClick();
    final initial = start ? _quietStart : _quietEnd;
    var draft = initial;
    showCupertinoModalPopup<void>(
      context: context,
      builder: (ctx) => SheetPickerScaffold(
        title: start ? 'Quiet from' : 'Quiet until',
        onCancel: () => Navigator.pop(ctx),
        onDone: () {
          HapticFeedback.selectionClick();
          setState(() {
            if (start) {
              _quietStart = draft;
            } else {
              _quietEnd = draft;
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
      title: 'Notifications',
      backgroundColor: const Color(0x00000000),
      transitionBetweenRoutes: true,
      slivers: [
        SliverPagePadding(
          top: QSpace.xs,
          child: QStagger(children: [
              const QSectionHeader(label: 'Permission'),
              FrostedGroup(children: [
                SettingsRow(
                  icon: _authorized
                      ? CupertinoIcons.checkmark_seal_fill
                      : CupertinoIcons.exclamationmark_triangle_fill,
                  iconColor: _authorized ? QColors.wellbeing : QColors.warn,
                  title: 'Notifications',
                  value: _authorized ? 'Allowed' : null,
                  chevron: false,
                  trailing: _authorized
                      ? null
                      : CupertinoButton(
                          padding: const EdgeInsets.symmetric(
                              horizontal: QSpace.sm),
                          minimumSize: const Size(44, 44),
                          onPressed: () {
                            HapticFeedback.selectionClick();
                            setState(() => _authorized = true);
                          },
                          child: const Text('Enable'),
                        ),
                ),
              ]),
              SettingsFootnote(_authorized
                  ? 'Quoril can send you focus alerts and nudges.'
                  : 'Enable notifications in iOS Settings to receive nudges.'),
              const SizedBox(height: QSpace.xl),
              const QSectionHeader(label: 'Alerts'),
              FrostedGroup(children: [
                SettingsSwitchRow(
                  icon: CupertinoIcons.hand_raised_fill,
                  iconColor: QColors.breakColor,
                  title: 'Distraction nudges',
                  value: _nudges,
                  onChanged: (v) => setState(() => _nudges = v),
                ),
                SettingsSwitchRow(
                  icon: CupertinoIcons.checkmark_circle_fill,
                  iconColor: QColors.wellbeing,
                  title: 'Session complete',
                  value: _sessionComplete,
                  onChanged: (v) => setState(() => _sessionComplete = v),
                ),
                SettingsSwitchRow(
                  icon: CupertinoIcons.speaker_2_fill,
                  iconColor: QColors.breakColor,
                  title: 'Sound',
                  value: _sound,
                  onChanged: (v) => setState(() => _sound = v),
                ),
              ]),
              const SizedBox(height: QSpace.xl),
              const QSectionHeader(label: 'Quiet hours'),
              FrostedGroup(children: [
                SettingsSwitchRow(
                  icon: CupertinoIcons.moon_fill,
                  iconColor: QColors.workspacePalette[2],
                  title: 'Quiet hours',
                  value: _quietHours,
                  onChanged: (v) => setState(() => _quietHours = v),
                ),
                if (_quietHours)
                  SettingsRow(
                    icon: CupertinoIcons.clock_fill,
                    iconColor: QColors.labelSecondary,
                    title: 'From – To',
                    chevron: false,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _Chip(
                          label: _hm(_quietStart),
                          onTap: () => _pickQuiet(true),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 6),
                          child: Text('–'),
                        ),
                        _Chip(
                          label: _hm(_quietEnd),
                          onTap: () => _pickQuiet(false),
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

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.onTap});
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
        child: Text(
          label,
          style: QType.subhead.copyWith(
            color: QColors.breakColor.resolveFrom(context),
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ),
    );
  }
}
