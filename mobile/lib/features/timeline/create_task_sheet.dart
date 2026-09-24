import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/editorial.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/primary_button.dart';
import '../home/sheets/q_sheet.dart';
import 'timeline_style.dart';

/// Schedule a task onto [day]: name it, place it at a time, pick a duration.
///
/// Built to the Ember Editorial sheet recipe and made visually consistent with
/// the home task editor (`showTaskEditorSheet`): a grabber, a `Cancel · Add`
/// header with the title field acting AS the header (title2), inset grouped
/// rows, an inline-revealed time wheel, ember duration chips, a live
/// date · time-range · duration preview, and a pinned primary pill.
Future<void> showCreateTask(BuildContext context, {required DateTime day}) {
  return showCupertinoModalPopup<void>(
    context: context,
    barrierColor: CupertinoColors.black.withValues(alpha: 0.4),
    builder: (_) => _CreateTaskSheet(day: day),
  );
}

class _CreateTaskSheet extends ConsumerStatefulWidget {
  const _CreateTaskSheet({required this.day});
  final DateTime day;

  @override
  ConsumerState<_CreateTaskSheet> createState() => _CreateTaskSheetState();
}

class _CreateTaskSheetState extends ConsumerState<_CreateTaskSheet> {
  final _titleCtrl = TextEditingController();

  late int _startMin; // minute-of-day
  int _durMin = 45;
  bool _timeOpen = false; // inline time wheel reveal

  static const _wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  static const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  static const _durations = [15, 30, 45, 60, 90];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    // Default to the next round quarter-hour.
    _startMin = (((now.hour * 60 + now.minute) ~/ 15) + 1) * 15 % (24 * 60);
    _titleCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    super.dispose();
  }

  bool get _hasTitle => _titleCtrl.text.trim().isNotEmpty;

  String get _dateLabel {
    final d = widget.day;
    return '${_wd[d.weekday - 1]} ${d.day} ${_months[d.month - 1]}';
  }

  String get _timeLabel => clockLabel(context, _startMin);

  void _create() {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) return;
    HapticFeedback.mediumImpact();
    final start = DateTime(widget.day.year, widget.day.month, widget.day.day, _startMin ~/ 60, _startMin % 60);
    ref.read(tasksProvider.notifier).addScheduled(title: title, startAt: start, durationMinutes: _durMin);
    Navigator.of(context).pop();
  }

  void _pickCustomDuration() {
    FocusScope.of(context).unfocus();
    final steps = [for (var m = 15; m <= 600; m += 15) m];
    var picked = _durMin;
    if (!steps.contains(picked)) {
      picked = steps.reduce((a, b) => (a - _durMin).abs() <= (b - _durMin).abs() ? a : b);
    }
    showCupertinoModalPopup<void>(
      context: context,
      builder: (ctx) => Container(
        height: 288,
        decoration: const BoxDecoration(
          color: CupertinoColors.systemGroupedBackground,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            children: [
              const QGrabber(),
              CupertinoButton(
                onPressed: () {
                  HapticFeedback.selectionClick();
                  setState(() => _durMin = picked);
                  Navigator.of(ctx).pop();
                },
                child: Text('Done', style: QType.headline.copyWith(color: QSection.calendar.resolveFrom(ctx))),
              ),
              Expanded(
                child: CupertinoPicker(
                  scrollController: FixedExtentScrollController(initialItem: steps.indexOf(picked)),
                  itemExtent: 36,
                  onSelectedItemChanged: (i) => picked = steps[i],
                  children: [for (final m in steps) Center(child: Text(durationLabel(m)))],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.72,
      minChildSize: 0.5,
      maxChildSize: 0.94,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: CupertinoColors.systemGroupedBackground,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              const QGrabber(),
              _header(context),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xs, QSpace.md, QSpace.xxl),
                  children: [
                    _titleField(context),
                    const SizedBox(height: QSpace.md),
                    _previewRow(context),
                    const SizedBox(height: QSpace.lg),
                    const QSectionHeader(label: 'Schedule'),
                    _scheduleCard(context),
                    const SizedBox(height: QSpace.lg),
                    const QSectionHeader(label: 'Duration'),
                    _DurationChips(
                      options: _durations,
                      selected: _durMin,
                      onSelect: (v) {
                        HapticFeedback.selectionClick();
                        setState(() => _durMin = v);
                      },
                      onCustom: _pickCustomDuration,
                    ),
                  ],
                ),
              ),
              _PinnedBar(
                bottomInset: bottomInset,
                child: PrimaryButton(
                  label: 'Add task',
                  color: QSection.calendar,
                  onPressed: _hasTitle ? _create : null,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // -- Header: Cancel (plain, left) / Add (right). Title field IS the header. --

  Widget _header(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(QSpace.xs, 0, QSpace.xs, QSpace.xs),
      child: Row(
        children: [
          CupertinoButton(
            padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 4),
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: QType.body.copyWith(color: QColors.labelSecondary.resolveFrom(context))),
          ),
          const Spacer(),
          CupertinoButton(
            padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 4),
            onPressed: _hasTitle ? _create : null,
            child: Text(
              'Add',
              style: QType.headline.copyWith(
                color: _hasTitle ? QSection.calendar.resolveFrom(context) : QColors.labelTertiary.resolveFrom(context),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // -- Title field as the sheet header (title2) -------------------------------

  Widget _titleField(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: QSpace.xxs, bottom: QSpace.xs),
      child: CupertinoTextField.borderless(
        controller: _titleCtrl,
        autofocus: true,
        placeholder: 'What needs doing?',
        placeholderStyle: QType.title2.copyWith(color: QColors.labelTertiary.resolveFrom(context)),
        style: QType.title2,
        padding: EdgeInsets.zero,
        maxLines: null,
        cursorColor: QSection.calendar.resolveFrom(context),
        onSubmitted: (_) => _create(),
      ),
    );
  }

  // -- Live preview: date · time-range · duration -----------------------------

  Widget _previewRow(BuildContext context) {
    final ember = QSection.calendar.resolveFrom(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.sm),
      decoration: BoxDecoration(
        color: ember.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(QRadius.card),
      ),
      child: Row(
        children: [
          Icon(CupertinoIcons.calendar_today, size: 18, color: ember),
          const SizedBox(width: QSpace.sm),
          Expanded(
            child: Text(
              '$_dateLabel · ${clockLabel(context, _startMin)} – ${clockLabel(context, _startMin + _durMin)}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: QType.subhead.copyWith(
                color: QColors.label.resolveFrom(context),
                fontWeight: FontWeight.w600,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
          const SizedBox(width: QSpace.xs),
          Text(
            durationLabel(_durMin),
            style: QType.meta.copyWith(color: ember, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }

  // -- Schedule card: date row + time row (reveals an inline time wheel) ------

  Widget _scheduleCard(BuildContext context) {
    final d = widget.day;
    return QGroup(children: [
      QRow(
        icon: CupertinoIcons.calendar,
        label: 'Date',
        value: '$_dateLabel ${d.year}',
        chevron: false,
      ),
      QRow(
        icon: CupertinoIcons.clock,
        label: 'Starts',
        value: _timeLabel,
        valueColor: _timeOpen ? QSection.calendar : null,
        onTap: () {
          HapticFeedback.selectionClick();
          FocusScope.of(context).unfocus();
          setState(() => _timeOpen = !_timeOpen);
        },
        chevron: false,
      ),
      if (_timeOpen)
        SizedBox(
          height: 180,
          child: CupertinoDatePicker(
            mode: CupertinoDatePickerMode.time,
            use24hFormat: MediaQuery.of(context).alwaysUse24HourFormat,
            minuteInterval: 5,
            initialDateTime: DateTime(d.year, d.month, d.day, _startMin ~/ 60, _startMin % 60),
            onDateTimeChanged: (t) => setState(() => _startMin = t.hour * 60 + t.minute),
          ),
        ),
    ]);
  }
}

// ---------------------------------------------------------------------------

/// Ember duration chips: 15 / 30 / 45 / 60 / 90 + a Custom chip. The selected
/// value is the one ember fill; a custom value shows as an extra selected chip.
class _DurationChips extends StatelessWidget {
  const _DurationChips({
    required this.options,
    required this.selected,
    required this.onSelect,
    required this.onCustom,
  });
  final List<int> options;
  final int selected;
  final ValueChanged<int> onSelect;
  final VoidCallback onCustom;

  String _label(int m) => m == 90 ? '1.5h' : durationLabel(m);

  @override
  Widget build(BuildContext context) {
    final ember = QSection.calendar.resolveFrom(context);
    final shown = options.contains(selected) ? options : [...options, selected]
      ..sort();
    final isCustom = !options.contains(selected);

    Widget chip({required String text, required bool active, required VoidCallback onTap}) {
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          height: 40,
          padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active ? ember : QColors.surface.resolveFrom(context),
            borderRadius: BorderRadius.circular(QRadius.capsule),
            boxShadow: active ? null : QElevation.card(context),
          ),
          child: Text(
            text,
            style: QType.subhead.copyWith(
              fontWeight: FontWeight.w700,
              color: active ? CupertinoColors.white : QColors.labelSecondary.resolveFrom(context),
            ),
          ),
        ),
      );
    }

    return Wrap(
      spacing: QSpace.xs,
      runSpacing: QSpace.xs,
      children: [
        for (final m in shown)
          chip(text: _label(m), active: m == selected, onTap: () => onSelect(m)),
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onCustom,
          child: Container(
            height: 40,
            padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: QColors.surface.resolveFrom(context),
              borderRadius: BorderRadius.circular(QRadius.capsule),
              boxShadow: QElevation.card(context),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Custom',
                  style: QType.subhead.copyWith(
                    fontWeight: FontWeight.w700,
                    color: isCustom ? ember : QColors.labelSecondary.resolveFrom(context),
                  ),
                ),
                const SizedBox(width: 2),
                Icon(CupertinoIcons.chevron_right, size: 13,
                    color: isCustom ? ember : QColors.labelTertiary.resolveFrom(context)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// A blurred hairline bar pinning the primary pill above the keyboard.
class _PinnedBar extends StatelessWidget {
  const _PinnedBar({required this.child, required this.bottomInset});
  final Widget child;
  final double bottomInset;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      radius: 0,
      tint: QColors.bgGrouped,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          QSpace.md,
          QSpace.sm,
          QSpace.md,
          bottomInset > 0 ? bottomInset + QSpace.sm : MediaQuery.of(context).padding.bottom + QSpace.sm,
        ),
        child: child,
      ),
    );
  }
}
