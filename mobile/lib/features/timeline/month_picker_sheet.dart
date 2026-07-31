import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';

/// Structured-style month picker: a full month grid with per-day density pills
/// and a coral selected day. Returns the tapped date (or null if dismissed).
Future<DateTime?> showMonthPicker(
  BuildContext context, {
  required DateTime initial,
  required List<Color> Function(DateTime) densityFor,
}) {
  return showCupertinoModalPopup<DateTime>(
    context: context,
    builder: (_) => _MonthPickerSheet(initial: initial, densityFor: densityFor),
  );
}

class _MonthPickerSheet extends StatefulWidget {
  const _MonthPickerSheet({required this.initial, required this.densityFor});
  final DateTime initial;
  final List<Color> Function(DateTime) densityFor;

  @override
  State<_MonthPickerSheet> createState() => _MonthPickerSheetState();
}

class _MonthPickerSheetState extends State<_MonthPickerSheet> {
  late DateTime _month; // first of the visible month
  late DateTime _selected;

  static const _months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  static const _wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  @override
  void initState() {
    super.initState();
    _selected = DateTime(widget.initial.year, widget.initial.month, widget.initial.day);
    _month = DateTime(widget.initial.year, widget.initial.month);
  }

  int get _daysInMonth => DateTime(_month.year, _month.month + 1, 0).day;
  int get _leadingBlanks => DateTime(_month.year, _month.month, 1).weekday - 1; // Monday-first

  bool _same(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

  @override
  Widget build(BuildContext context) {
    final bg = QColors.bg.resolveFrom(context);
    final totalCells = _leadingBlanks + _daysInMonth;
    final rows = (totalCells / 7).ceil();

    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.md, QSpace.md, QSpace.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => setState(() => _month = DateTime(_month.year, _month.month - 1)),
                    child: Icon(CupertinoIcons.chevron_left, size: 20, color: QColors.labelSecondary.resolveFrom(context)),
                  ),
                  const SizedBox(width: QSpace.sm),
                  Text('${_months[_month.month - 1]} ', style: QType.title2.copyWith(fontWeight: FontWeight.w800)),
                  Text('${_month.year}', style: QType.title2.copyWith(fontWeight: FontWeight.w800, color: kAccent)),
                  const SizedBox(width: 2),
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => setState(() => _month = DateTime(_month.year, _month.month + 1)),
                    child: Icon(CupertinoIcons.chevron_right, size: 20, color: kAccent),
                  ),
                  const Spacer(),
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(
                      width: 32,
                      height: 32,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: QColors.fill.resolveFrom(context), shape: BoxShape.circle),
                      child: Icon(CupertinoIcons.xmark, size: 16, color: QColors.label.resolveFrom(context)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: QSpace.md),
              Row(
                children: [
                  for (final l in _wd)
                    Expanded(
                      child: Text(l,
                          textAlign: TextAlign.center,
                          style: QType.caption.copyWith(color: QColors.labelTertiary.resolveFrom(context))),
                    ),
                ],
              ),
              const SizedBox(height: QSpace.sm),
              for (var r = 0; r < rows; r++)
                Row(children: [for (var c = 0; c < 7; c++) Expanded(child: _cell(context, r * 7 + c))]),
            ],
          ),
        ),
      ),
    );
  }

  Widget _cell(BuildContext context, int index) {
    if (index < _leadingBlanks) return const SizedBox(height: 54);
    final day = index - _leadingBlanks + 1;
    if (day > _daysInMonth) return const SizedBox(height: 54);
    final date = DateTime(_month.year, _month.month, day);
    final sel = _same(date, _selected);
    final density = widget.densityFor(date);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        Navigator.of(context).pop(date);
      },
      child: SizedBox(
        height: 54,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: sel ? kAccent : const Color(0x00000000), shape: BoxShape.circle),
              child: Text('$day',
                  style: QType.subhead.copyWith(
                    fontWeight: FontWeight.w700,
                    fontFeatures: const [FontFeature.tabularFigures()],
                    color: sel ? CupertinoColors.white : QColors.label.resolveFrom(context),
                  )),
            ),
            const SizedBox(height: 3),
            SizedBox(
              height: 5,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (final col in density)
                    Container(
                      width: 5,
                      height: 5,
                      margin: const EdgeInsets.symmetric(horizontal: 0.7),
                      decoration: BoxDecoration(color: col, borderRadius: BorderRadius.circular(2)),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
