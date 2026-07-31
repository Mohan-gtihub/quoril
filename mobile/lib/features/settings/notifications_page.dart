import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/inset_list.dart';

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
                _quietStart = m;
              } else {
                _quietEnd = m;
              }
            }),
          ),
        ),
      ),
    );
  }

  CupertinoSwitch _sw(bool value, ValueChanged<bool> onChanged) =>
      CupertinoSwitch(
        value: value,
        onChanged: (v) {
          HapticFeedback.selectionClick();
          onChanged(v);
        },
      );

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
            largeTitle: Text('Notifications'),
            backgroundColor: Color(0x00000000),
            border: null,
          ),
          SliverList(
            delegate: SliverChildListDelegate([
              const SizedBox(height: QSpace.xs),
              InsetSection(
                header: 'Permission',
                footer: _authorized
                    ? 'Quoril can send you focus alerts and nudges.'
                    : 'Enable notifications in iOS Settings to receive nudges.',
                children: [
                  InsetRow(
                    icon: _authorized
                        ? CupertinoIcons.checkmark_seal_fill
                        : CupertinoIcons.exclamationmark_triangle_fill,
                    iconColor: _authorized ? QColors.wellbeing : QColors.warn,
                    title: 'Notifications',
                    value: _authorized ? 'Allowed' : 'Not allowed',
                    showChevron: false,
                    trailing: _authorized
                        ? null
                        : CupertinoButton(
                            padding: EdgeInsets.zero,
                            onPressed: () {
                              HapticFeedback.selectionClick();
                              setState(() => _authorized = true);
                            },
                            child: const Text('Enable'),
                            minimumSize: Size(0, 0),
                          ),
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xl),
              InsetSection(
                header: 'Alerts',
                children: [
                  InsetRow(
                    icon: CupertinoIcons.hand_raised_fill,
                    iconColor: QColors.breakColor,
                    title: 'Distraction nudges',
                    showChevron: false,
                    trailing: _sw(_nudges, (v) => setState(() => _nudges = v)),
                  ),
                  InsetRow(
                    icon: CupertinoIcons.checkmark_circle_fill,
                    iconColor: QColors.wellbeing,
                    title: 'Session complete',
                    showChevron: false,
                    trailing: _sw(
                      _sessionComplete,
                      (v) => setState(() => _sessionComplete = v),
                    ),
                  ),
                  InsetRow(
                    icon: CupertinoIcons.speaker_2_fill,
                    iconColor: QColors.breakColor,
                    title: 'Sound',
                    showChevron: false,
                    trailing: _sw(_sound, (v) => setState(() => _sound = v)),
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xl),
              InsetSection(
                header: 'Quiet Hours',
                children: [
                  InsetRow(
                    icon: CupertinoIcons.moon_fill,
                    iconColor: QColors.workspacePalette[2],
                    title: 'Quiet hours',
                    showChevron: false,
                    trailing: _sw(
                      _quietHours,
                      (v) => setState(() => _quietHours = v),
                    ),
                  ),
                  if (_quietHours)
                    InsetRow(
                      icon: CupertinoIcons.clock_fill,
                      iconColor: QColors.labelSecondary,
                      title: 'From – To',
                      showChevron: false,
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

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.onTap});
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
