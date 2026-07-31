import 'dart:math' as math;

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// A single task row — a clean, native inset card built on [CupertinoListTile].
/// Leading check circle, title (+ priority flame), an estimate/subtask subtitle,
/// and a small list badge. Reorder + edit + delete live in the context menu.
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

  String? _metaLine() {
    final parts = <String>[];
    final e = widget.task.estimateMinutes;
    if (e != null) {
      final h = e ~/ 60;
      final m = e % 60;
      parts.add(h > 0 ? (m > 0 ? 'Est ${h}h ${m}m' : 'Est ${h}h') : 'Est ${m}m');
    }
    final s = widget.task.spentSeconds;
    if (s > 0) {
      final m = s ~/ 60;
      final h = m ~/ 60;
      parts.add(h > 0 ? '${h}h ${m % 60}m done' : '${m}m done');
    }
    return parts.isEmpty ? null : parts.join('  ·  ');
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.task;
    final done = t.done;
    final hasSubs = t.subtasks.isNotEmpty;
    final accent = t.priority.color.resolveFrom(context);
    final radius = BorderRadius.circular(QRadius.taskCard);
    final meta = _metaLine();
    final isHot = t.priority == Priority.high || t.priority == Priority.critical;

    final tile = CupertinoListTile(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.xs),
      backgroundColor: QColors.surface.resolveFrom(context),
      backgroundColorActivated: QColors.secondaryFill.resolveFrom(context),
      leading: _CheckCircle(done: done, onTap: widget.onToggle),
      title: Row(
        children: [
          if (isHot) ...[
            Icon(CupertinoIcons.flame_fill, size: 13, color: accent),
            const SizedBox(width: 5),
          ],
          Flexible(
            child: Text(
              t.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: QType.body.copyWith(
                fontWeight: FontWeight.w600,
                decoration: done ? TextDecoration.lineThrough : null,
                color: done
                    ? QColors.labelTertiary.resolveFrom(context)
                    : QColors.label.resolveFrom(context),
              ),
            ),
          ),
        ],
      ),
      subtitle: meta == null
          ? null
          : Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                meta,
                style: QType.footnote.copyWith(
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
      trailing: _ListBadge(color: widget.badgeColor, letter: widget.badgeLetter),
      onTap: widget.onTap,
    );

    final card = ClipRRect(
      borderRadius: radius,
      child: Container(
        color: QColors.surface.resolveFrom(context),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            tile,
            if (hasSubs) _subtasks(context, t),
          ],
        ),
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
        if (widget.onMovePrev != null)
          CupertinoContextMenuAction(
            onPressed: () {
              Navigator.pop(context);
              widget.onMovePrev!();
            },
            trailingIcon: CupertinoIcons.arrow_left,
            child: const Text('Move back'),
          ),
        if (widget.onMoveNext != null)
          CupertinoContextMenuAction(
            onPressed: () {
              Navigator.pop(context);
              widget.onMoveNext!();
            },
            trailingIcon: CupertinoIcons.arrow_right,
            child: const Text('Move forward'),
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
        final previewing = animation.value >= CupertinoContextMenu.animationOpensAt;
        // During the context-menu preview the card is lifted onto a plain
        // background — give it a rounded clip so it doesn't show square corners.
        if (previewing) return card;
        return card;
      },
    );
  }

  Widget _subtasks(BuildContext context, Task t) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(height: 0.5, color: QColors.separator.resolveFrom(context).withValues(alpha: 0.5)),
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {
            HapticFeedback.selectionClick();
            setState(() => _expanded = !_expanded);
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.sm),
            child: Row(
              children: [
                _SubtaskRing(done: t.subtaskDone, total: t.subtasks.length),
                const SizedBox(width: QSpace.xs),
                Text(
                  '${t.subtaskDone}/${t.subtasks.length} subtasks',
                  style: QType.footnote,
                ),
                const Spacer(),
                Icon(
                  _expanded ? CupertinoIcons.chevron_up : CupertinoIcons.chevron_down,
                  size: 13,
                  color: QColors.labelTertiary.resolveFrom(context),
                ),
              ],
            ),
          ),
        ),
        if (_expanded)
          Padding(
            padding: const EdgeInsets.fromLTRB(QSpace.md, 0, QSpace.md, QSpace.xs),
            child: Column(
              children: [
                for (final s in t.subtasks)
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => widget.onSubtaskToggle(s),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Icon(
                            s.done ? CupertinoIcons.checkmark_circle_fill : CupertinoIcons.circle,
                            size: 18,
                            color: s.done
                                ? QColors.wellbeing.resolveFrom(context)
                                : QColors.labelTertiary.resolveFrom(context),
                          ),
                          const SizedBox(width: QSpace.sm),
                          Expanded(
                            child: Text(
                              s.title,
                              style: QType.subhead.copyWith(
                                decoration: s.done ? TextDecoration.lineThrough : null,
                                color: s.done
                                    ? QColors.labelTertiary.resolveFrom(context)
                                    : QColors.label.resolveFrom(context),
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
        width: 28,
        height: 28,
        child: Center(
          child: AnimatedSwitcher(
            duration: QMotion.fast,
            transitionBuilder: (c, a) => ScaleTransition(scale: a, child: c),
            child: Icon(
              done ? CupertinoIcons.checkmark_circle_fill : CupertinoIcons.circle,
              key: ValueKey(done),
              size: 26,
              color: done
                  ? QColors.wellbeing.resolveFrom(context)
                  : QColors.labelTertiary.resolveFrom(context),
            ),
          ),
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

class _SubtaskRing extends StatelessWidget {
  const _SubtaskRing({required this.done, required this.total});
  final int done;
  final int total;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 14,
      height: 14,
      child: CustomPaint(
        painter: _SubtaskRingPainter(
          total == 0 ? 0 : done / total,
          QColors.fill.resolveFrom(context),
          QColors.wellbeing.resolveFrom(context),
        ),
      ),
    );
  }
}

class _SubtaskRingPainter extends CustomPainter {
  _SubtaskRingPainter(this.frac, this.track, this.fill);
  final double frac;
  final Color track;
  final Color fill;

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
  bool shouldRepaint(covariant _SubtaskRingPainter old) =>
      old.frac != frac || old.track != track || old.fill != fill;
}
