import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import 'timeline_style.dart';

/// Structured-style two-step task creation: name the task (with a suggestion),
/// then pick its time + duration. Creates a scheduled task on [day].
Future<void> showCreateTask(BuildContext context, {required DateTime day}) {
  return Navigator.of(context, rootNavigator: true).push(
    CupertinoPageRoute(fullscreenDialog: true, builder: (_) => _CreateTaskFlow(day: day)),
  );
}

class _CreateTaskFlow extends ConsumerStatefulWidget {
  const _CreateTaskFlow({required this.day});
  final DateTime day;

  @override
  ConsumerState<_CreateTaskFlow> createState() => _CreateTaskFlowState();
}

class _CreateTaskFlowState extends ConsumerState<_CreateTaskFlow> {
  final _titleCtrl = TextEditingController();
  int _step = 0;

  // Schedule state.
  late int _startMin; // minute-of-day
  int _durMin = 45;

  static const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  static const _wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  static const _durations = [15, 30, 45, 60, 90];

  @override
  void initState() {
    super.initState();
    // Default to the next round-ish slot.
    final now = DateTime.now();
    _startMin = (((now.hour * 60 + now.minute) ~/ 15) + 1) * 15 % (24 * 60);
    _titleCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    super.dispose();
  }

  Color get _color {
    final t = _titleCtrl.text.trim();
    if (t.isEmpty) return kTimelinePalette.first;
    return kTimelinePalette[t.hashCode.abs() % kTimelinePalette.length];
  }

  String _range(int start, int dur) => '${hhmm(start)} – ${hhmm(start + dur)}';

  void _create() {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) return;
    HapticFeedback.mediumImpact();
    final start = DateTime(widget.day.year, widget.day.month, widget.day.day, _startMin ~/ 60, _startMin % 60);
    ref.read(tasksProvider.notifier).addScheduled(title: title, startAt: start, durationMinutes: _durMin);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: _step == 0 ? _buildName(context) : _buildSchedule(context),
    );
  }

  // -- Step 1: name -----------------------------------------------------------

  Widget _buildName(BuildContext context) {
    final hasTitle = _titleCtrl.text.trim().isNotEmpty;
    return Column(
      children: [
        _Header(color: _color, title: _titleCtrl.text, editable: true, controller: _titleCtrl, onClose: () => Navigator.pop(context)),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(QSpace.md),
            children: [
              if (hasTitle) ...[
                Text('SUGGESTIONS', style: QType.caption.copyWith(fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                const SizedBox(height: QSpace.sm),
                _SuggestionCard(
                  color: _color,
                  icon: timelineIconFor(_titleCtrl.text),
                  range: _range(_startMin, _durMin),
                  durMin: _durMin,
                  title: _titleCtrl.text.trim(),
                  onTap: () => setState(() => _step = 1),
                ),
              ],
            ],
          ),
        ),
        _ContinueBar(
          color: _color,
          enabled: hasTitle,
          onTap: () {
            FocusScope.of(context).unfocus();
            setState(() => _step = 1);
          },
        ),
      ],
    );
  }

  // -- Step 2: schedule -------------------------------------------------------

  Widget _buildSchedule(BuildContext context) {
    final d = widget.day;
    final dateLabel = '${_wd[d.weekday - 1]} ${d.day}. ${_months[d.month - 1]} ${d.year}';
    return Column(
      children: [
        _Header(color: _color, title: _titleCtrl.text, editable: false, onClose: () => Navigator.pop(context), showRing: true, subtitle: _range(_startMin, _durMin)),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(QSpace.md),
            children: [
              _Card(
                child: Row(
                  children: [
                    Icon(CupertinoIcons.calendar, size: 18, color: _color),
                    const SizedBox(width: QSpace.sm),
                    Text(dateLabel, style: QType.body.copyWith(fontWeight: FontWeight.w600)),
                    const Spacer(),
                    Icon(CupertinoIcons.chevron_right, size: 16, color: QColors.labelTertiary.resolveFrom(context)),
                  ],
                ),
              ),
              const SizedBox(height: QSpace.lg),
              Text('Time', style: QType.headline),
              const SizedBox(height: QSpace.sm),
              _Card(
                padding: EdgeInsets.zero,
                child: SizedBox(
                  height: 180,
                  child: CupertinoDatePicker(
                    mode: CupertinoDatePickerMode.time,
                    use24hFormat: true,
                    minuteInterval: 5,
                    initialDateTime: DateTime(d.year, d.month, d.day, _startMin ~/ 60, _startMin % 60),
                    onDateTimeChanged: (t) => setState(() => _startMin = t.hour * 60 + t.minute),
                  ),
                ),
              ),
              const SizedBox(height: QSpace.lg),
              Text('Duration', style: QType.headline),
              const SizedBox(height: QSpace.sm),
              _DurationBar(
                options: _durations,
                selected: _durMin,
                color: _color,
                onSelect: (v) => setState(() => _durMin = v),
              ),
            ],
          ),
        ),
        _ContinueBar(color: _color, enabled: true, onTap: _create),
      ],
    );
  }
}

// ---------------------------------------------------------------------------

class _Header extends StatelessWidget {
  const _Header({
    required this.color,
    required this.title,
    required this.editable,
    required this.onClose,
    this.controller,
    this.showRing = false,
    this.subtitle,
  });

  final Color color;
  final String title;
  final bool editable;
  final VoidCallback onClose;
  final TextEditingController? controller;
  final bool showRing;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: color,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, QSpace.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: onClose,
                child: Container(
                  width: 32,
                  height: 32,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: CupertinoColors.white.withValues(alpha: 0.25), shape: BoxShape.circle),
                  child: const Icon(CupertinoIcons.xmark, size: 16, color: CupertinoColors.white),
                ),
              ),
              const SizedBox(height: QSpace.md),
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(color: CupertinoColors.white, shape: BoxShape.circle),
                    child: Icon(timelineIconFor(title.isEmpty ? 'task' : title), size: 26, color: color),
                  ),
                  const SizedBox(width: QSpace.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (subtitle != null)
                          Text(subtitle!, style: QType.footnote.copyWith(color: CupertinoColors.white.withValues(alpha: 0.85))),
                        editable
                            ? CupertinoTextField.borderless(
                                controller: controller,
                                autofocus: true,
                                placeholder: 'Task name',
                                placeholderStyle: QType.title3.copyWith(color: CupertinoColors.white.withValues(alpha: 0.6)),
                                style: QType.title3.copyWith(color: CupertinoColors.white, fontWeight: FontWeight.w700),
                                cursorColor: CupertinoColors.white,
                                padding: EdgeInsets.zero,
                              )
                            : Text(
                                title.isEmpty ? 'Task' : title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: QType.title3.copyWith(color: CupertinoColors.white, fontWeight: FontWeight.w700),
                              ),
                      ],
                    ),
                  ),
                  if (showRing) ...[
                    const SizedBox(width: QSpace.sm),
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: CupertinoColors.white, width: 2),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SuggestionCard extends StatelessWidget {
  const _SuggestionCard({
    required this.color,
    required this.icon,
    required this.range,
    required this.durMin,
    required this.title,
    required this.onTap,
  });

  final Color color;
  final IconData icon;
  final String range;
  final int durMin;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return _Card(
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, size: 22, color: color),
          const SizedBox(width: QSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$range  ($durMin min)',
                    style: QType.caption.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
                const SizedBox(height: 2),
                Text(title, style: QType.headline.copyWith(fontWeight: FontWeight.w700)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DurationBar extends StatelessWidget {
  const _DurationBar({required this.options, required this.selected, required this.color, required this.onSelect});
  final List<int> options;
  final int selected;
  final Color color;
  final ValueChanged<int> onSelect;

  String _label(int m) {
    if (m < 60) return '${m}m';
    if (m == 60) return '1h';
    if (m == 90) return '1.5h';
    return '${(m / 60).toStringAsFixed(1)}h';
  }

  @override
  Widget build(BuildContext context) {
    return _Card(
      padding: const EdgeInsets.all(6),
      child: Row(
        children: [
          for (final m in options)
            Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  HapticFeedback.selectionClick();
                  onSelect(m);
                },
                child: Container(
                  height: 38,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: m == selected ? color : const Color(0x00000000),
                    borderRadius: BorderRadius.circular(QRadius.capsule),
                  ),
                  child: Text(
                    _label(m),
                    style: QType.subhead.copyWith(
                      fontWeight: FontWeight.w700,
                      color: m == selected ? CupertinoColors.white : QColors.labelSecondary.resolveFrom(context),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child, this.padding = const EdgeInsets.all(QSpace.md), this.onTap});
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(16),
      ),
      child: child,
    );
    if (onTap == null) return card;
    return GestureDetector(behavior: HitTestBehavior.opaque, onTap: onTap, child: card);
  }
}

class _ContinueBar extends StatelessWidget {
  const _ContinueBar({required this.color, required this.enabled, required this.onTap});
  final Color color;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xs, QSpace.md, QSpace.sm),
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: enabled ? onTap : null,
          child: Container(
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: enabled ? color : QColors.fill.resolveFrom(context),
              borderRadius: BorderRadius.circular(QRadius.capsule),
            ),
            child: Text(
              'Continue',
              style: QType.headline.copyWith(
                color: enabled ? CupertinoColors.white : QColors.labelTertiary.resolveFrom(context),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
