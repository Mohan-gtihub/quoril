import 'dart:math' as math;

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Elevated Blitzit-style task card (no border, depth via layering).
class TaskCard extends StatefulWidget {
  const TaskCard({
    super.key,
    required this.task,
    required this.badgeColor,
    required this.badgeLetter,
    required this.onToggle,
    required this.onMovePrev,
    required this.onMoveNext,
    required this.onTap,
    required this.onEdit,
    required this.onDelete,
    required this.onSubtaskToggle,
  });

  final Task task;
  final Color badgeColor;
  final String badgeLetter;
  final VoidCallback onToggle;
  final VoidCallback? onMovePrev;
  final VoidCallback? onMoveNext;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final void Function(Subtask) onSubtaskToggle;

  @override
  State<TaskCard> createState() => _TaskCardState();
}

class _TaskCardState extends State<TaskCard> {
  bool _expanded = false;

  String _estLabel() {
    final e = widget.task.estimateMinutes;
    if (e == null) return 'No est';
    final h = e ~/ 60;
    final m = e % 60;
    if (h > 0) return m > 0 ? 'Est ${h}h ${m}m' : 'Est ${h}h';
    return 'Est ${m}m';
  }

  String _spentLabel() {
    final s = widget.task.spentSeconds;
    if (s == 0) return '';
    final m = s ~/ 60;
    final h = m ~/ 60;
    if (h > 0) return '${h}h ${m % 60}m done';
    return '${m}m done';
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.task;
    final done = t.done;
    final hasSubs = t.subtasks.isNotEmpty;

    final card = Container(
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.taskCard),
      ),
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _CheckCircle(done: done, onTap: widget.onToggle),
              const SizedBox(width: QSpace.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        if (t.priority == Priority.high || t.priority == Priority.critical) ...[
                          Icon(CupertinoIcons.flame_fill, size: 13, color: t.priority.color.resolveFrom(context)),
                          const SizedBox(width: 4),
                        ],
                        Flexible(
                          child: Text(
                            t.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: QType.callout.copyWith(
                              fontWeight: FontWeight.w600,
                              decoration: done ? TextDecoration.lineThrough : null,
                              color: done ? QColors.labelTertiary.resolveFrom(context) : QColors.label.resolveFrom(context),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: QSpace.xs),
              _MoveArrow(icon: CupertinoIcons.chevron_left, onTap: widget.onMovePrev),
              _MoveArrow(icon: CupertinoIcons.chevron_right, onTap: widget.onMoveNext),
              const SizedBox(width: QSpace.xs),
              _ListBadge(color: widget.badgeColor, letter: widget.badgeLetter),
            ],
          ),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.only(left: 34),
            child: Row(
              children: [
                Text(
                  _estLabel(),
                  style: QType.caption.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
                ),
                const Spacer(),
                if (_spentLabel().isNotEmpty)
                  Text(
                    _spentLabel(),
                    style: QType.caption.copyWith(
                      fontFeatures: const [FontFeature.tabularFigures()],
                      color: QColors.tint.resolveFrom(context),
                    ),
                  ),
              ],
            ),
          ),
          if (hasSubs) ...[
            const SizedBox(height: 6),
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _expanded = !_expanded);
              },
              child: Padding(
                padding: const EdgeInsets.only(left: 34, top: 2, bottom: 2),
                child: Row(
                  children: [
                    _RingPainter.widget(context, t.subtaskDone, t.subtasks.length),
                    const SizedBox(width: QSpace.xs),
                    Text('${t.subtaskDone}/${t.subtasks.length} Subtasks', style: QType.caption),
                    const SizedBox(width: 4),
                    Icon(
                      _expanded ? CupertinoIcons.chevron_up : CupertinoIcons.chevron_down,
                      size: 12,
                      color: QColors.labelTertiary.resolveFrom(context),
                    ),
                  ],
                ),
              ),
            ),
            if (_expanded)
              Padding(
                padding: const EdgeInsets.only(left: 34, top: 4),
                child: Column(
                  children: [
                    for (final s in t.subtasks)
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () => widget.onSubtaskToggle(s),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 5),
                          child: Row(
                            children: [
                              Icon(
                                s.done ? CupertinoIcons.checkmark_circle_fill : CupertinoIcons.circle,
                                size: 18,
                                color: s.done ? QColors.tint.resolveFrom(context) : QColors.labelTertiary.resolveFrom(context),
                              ),
                              const SizedBox(width: QSpace.xs),
                              Expanded(
                                child: Text(
                                  s.title,
                                  style: QType.footnote.copyWith(
                                    decoration: s.done ? TextDecoration.lineThrough : null,
                                    color: s.done ? QColors.labelTertiary.resolveFrom(context) : QColors.labelSecondary.resolveFrom(context),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
          ],
        ],
      ),
    );

    return CupertinoContextMenu.builder(
      enableHapticFeedback: true,
      actions: [
        CupertinoContextMenuAction(
          onPressed: () {
            Navigator.pop(context);
            widget.onEdit();
          },
          trailingIcon: CupertinoIcons.pencil,
          child: const Text('Edit'),
        ),
        CupertinoContextMenuAction(
          onPressed: () {
            Navigator.pop(context);
            widget.onMoveNext?.call();
          },
          trailingIcon: CupertinoIcons.arrow_right,
          child: const Text('Move'),
        ),
        CupertinoContextMenuAction(
          isDestructiveAction: true,
          onPressed: () {
            Navigator.pop(context);
            widget.onDelete();
          },
          trailingIcon: CupertinoIcons.delete,
          child: const Text('Delete'),
        ),
      ],
      builder: (context, animation) {
        // While previewing, drop the tap gesture.
        final previewing = animation.value >= CupertinoContextMenu.animationOpensAt;
        return GestureDetector(
          onTap: previewing ? null : widget.onTap,
          behavior: HitTestBehavior.opaque,
          child: card,
        );
      },
    );
  }
}

class _CheckCircle extends StatelessWidget {
  const _CheckCircle({required this.done, required this.onTap});
  final bool done;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.heavyImpact();
        onTap();
      },
      child: SizedBox(
        width: 30,
        height: 30,
        child: Center(
          child: AnimatedSwitcher(
            duration: QMotion.fast,
            transitionBuilder: (c, a) => ScaleTransition(scale: a, child: c),
            child: Icon(
              done ? CupertinoIcons.checkmark_alt_circle_fill : CupertinoIcons.circle,
              key: ValueKey(done),
              size: 26,
              color: done ? QColors.wellbeing.resolveFrom(context) : QColors.labelTertiary.resolveFrom(context),
            ),
          ),
        ),
      ),
    );
  }
}

class _MoveArrow extends StatelessWidget {
  const _MoveArrow({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: enabled
          ? () {
              HapticFeedback.selectionClick();
              onTap!();
            }
          : null,
      child: SizedBox(
        width: 30,
        height: 44,
        child: Icon(
          icon,
          size: 18,
          color: enabled ? QColors.labelSecondary.resolveFrom(context) : QColors.labelTertiary.resolveFrom(context).withValues(alpha: 0.35),
        ),
      ),
    );
  }
}

class _ListBadge extends StatelessWidget {
  const _ListBadge({required this.color, required this.letter});
  final Color color;
  final String letter;

  @override
  Widget build(BuildContext context) {
    final c = color.resolveFrom(context);
    return Container(
      width: 24,
      height: 24,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(7),
      ),
      child: Text(
        letter,
        style: QType.caption.copyWith(color: c, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.frac, this.track, this.fill);
  final double frac;
  final Color track;
  final Color fill;

  static Widget widget(BuildContext context, int done, int total) {
    return SizedBox(
      width: 14,
      height: 14,
      child: CustomPaint(
        painter: _RingPainter(
          total == 0 ? 0 : done / total,
          QColors.fill.resolveFrom(context),
          QColors.tint.resolveFrom(context),
        ),
      ),
    );
  }

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = size.width / 2 - 1.4;
    final bg = Paint()
      ..color = track
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4;
    final fg = Paint()
      ..color = fill
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 2.4;
    canvas.drawCircle(c, r, bg);
    canvas.drawArc(Rect.fromCircle(center: c, radius: r), -math.pi / 2, 2 * math.pi * frac, false, fg);
  }

  @override
  bool shouldRepaint(covariant _RingPainter old) => old.frac != frac || old.track != track || old.fill != fill;
}
