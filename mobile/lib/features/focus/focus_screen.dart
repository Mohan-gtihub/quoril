import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/mock_data.dart';
import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/primary_button.dart';
import 'widgets/circular_timer.dart';
import 'widgets/friction_overlay.dart';

/// Immersive full-screen FOCUS MODE (launched as a fullscreenDialog from Home).
///
/// A large countdown ring, the current task, a "Protected · N saves" row, glass
/// Pause/Resume + Done capsules, a close (X) that confirms if >1min elapsed, a
/// Pomodoro break overlay, and the distraction-interception demo (nudge -> full
/// friction). On Done the session is logged and a celebration overlay is shown.
class FocusScreen extends ConsumerStatefulWidget {
  const FocusScreen({super.key, this.task});

  final Task? task;

  @override
  ConsumerState<FocusScreen> createState() => _FocusScreenState();
}

enum _Phase { running, paused }

class _FocusScreenState extends ConsumerState<FocusScreen> {
  static const _defaultSeconds = 25 * 60; // one Pomodoro-style work block
  static const _breakSeconds = 5 * 60;

  Timer? _ticker;
  Timer? _breakTicker;

  _Phase _phase = _Phase.running;
  int _totalSeconds = _defaultSeconds;
  int _remaining = _defaultSeconds;
  int _saves = 0;

  /// Total seconds actually focused this session (accumulates across blocks) and
  /// how many of those have already been written to the task. This is what binds
  /// the clock to the task — every worked second flows to the task's spent time.
  int _workedSeconds = 0;
  int _credited = 0;

  /// Elapsed (in seconds) at the start of the current lap/block; Lap Time is
  /// measured from here so it resets whenever the block is reset.
  int _lapStartElapsed = 0;

  // Overlays
  bool _showNudge = false;
  bool _showFriction = false;
  bool _showBreak = false;
  int _breakRemaining = 0;

  @override
  void initState() {
    super.initState();
    // Bind the block length to the task's estimate (Quoril desktop behavior).
    final est = widget.task?.estimateMinutes;
    if (est != null && est > 0) {
      _totalSeconds = est * 60;
      _remaining = _totalSeconds;
    }
    _runTicker();
  }

  /// Write any not-yet-credited focused time onto the task.
  void _creditFocus() {
    final task = widget.task;
    final delta = _workedSeconds - _credited;
    if (task != null && delta > 0) {
      _credited = _workedSeconds;
      ref.read(tasksProvider.notifier).logFocus(task.id, delta);
    }
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _breakTicker?.cancel();
    super.dispose();
  }

  int get _elapsed => _totalSeconds - _remaining;

  /// Time since the current lap/block started.
  int get _lapElapsed => (_elapsed - _lapStartElapsed).clamp(0, _totalSeconds);

  // ---- session control ----------------------------------------------------

  void _runTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_remaining > 0) {
        setState(() {
          _remaining--;
          _workedSeconds++;
        });
      } else {
        _onTimeUp();
      }
    });
  }

  void _onTimeUp() {
    _ticker?.cancel();
    // Natural end of a block: credit the focused time to the task, then break.
    _creditFocus();
    _startBreak();
  }

  void _togglePause() {
    HapticFeedback.selectionClick();
    setState(() {
      if (_phase == _Phase.running) {
        _phase = _Phase.paused;
        _ticker?.cancel();
      } else {
        _phase = _Phase.running;
        _runTicker();
      }
    });
  }

  /// Restart the current block: refill the timer and begin a fresh lap.
  void _reset() {
    HapticFeedback.mediumImpact();
    setState(() {
      _remaining = _totalSeconds;
      _lapStartElapsed = 0;
      _phase = _Phase.running;
    });
    _runTicker();
  }

  Future<void> _finish() async {
    _ticker?.cancel();
    HapticFeedback.heavyImpact();
    // The real focused length this session (accumulated across blocks).
    final seconds = _workedSeconds > 0 ? _workedSeconds : _elapsed;
    try {
      await ref.read(apiProvider).logSession(
            type: SessionType.deepWork,
            seconds: seconds,
            taskId: widget.task?.id,
          );
    } catch (_) {
      // Non-fatal: celebration still shows even if logging fails offline.
    }
    // Flush any remaining focused time onto the task.
    _creditFocus();
    if (!mounted) return;
    _showCelebration(seconds);
  }

  // ---- close / confirm -----------------------------------------------------

  Future<void> _requestClose() async {
    HapticFeedback.selectionClick();
    if (_workedSeconds <= 60) {
      _creditFocus(); // credit even a short stint before leaving
      Navigator.of(context).pop();
      return;
    }
    final leave = await showCupertinoModalPopup<bool>(
      context: context,
      builder: (ctx) => CupertinoActionSheet(
        title: const Text('End this session?'),
        message: Text("You've focused for ${fmtHm(_workedSeconds)}."),
        actions: [
          CupertinoActionSheetAction(
            isDestructiveAction: true,
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('End session'),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          isDefaultAction: true,
          onPressed: () => Navigator.pop(ctx, false),
          child: const Text('Keep focusing'),
        ),
      ),
    );
    if (leave == true && mounted) {
      // Persist the partial focus: record the session + credit the task.
      try {
        await ref.read(apiProvider).logSession(
              type: SessionType.deepWork,
              seconds: _workedSeconds,
              taskId: widget.task?.id,
            );
      } catch (_) {}
      _creditFocus();
      if (mounted) Navigator.of(context).pop();
    }
  }

  // ---- pomodoro break ------------------------------------------------------

  void _startBreak() {
    HapticFeedback.heavyImpact();
    setState(() {
      _showBreak = true;
      _breakRemaining = _breakSeconds;
    });
    _breakTicker?.cancel();
    _breakTicker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_breakRemaining > 0) {
        setState(() => _breakRemaining--);
      } else {
        _endBreak();
      }
    });
  }

  void _endBreak() {
    _breakTicker?.cancel();
    setState(() {
      _showBreak = false;
      _remaining = _defaultSeconds;
      _totalSeconds = _defaultSeconds;
      _lapStartElapsed = 0;
      _phase = _Phase.running;
    });
    _runTicker();
  }

  // ---- distraction demo ----------------------------------------------------

  void _simulateDistraction() {
    HapticFeedback.selectionClick();
    setState(() => _showNudge = true);
  }

  void _escalateToFriction() {
    HapticFeedback.selectionClick();
    setState(() {
      _showNudge = false;
      _showFriction = true;
    });
  }

  void _takeBreath() {
    HapticFeedback.heavyImpact();
    setState(() {
      _saves++;
      _showFriction = false;
    });
  }

  void _openMenu() {
    HapticFeedback.selectionClick();
    showCupertinoModalPopup<void>(
      context: context,
      builder: (ctx) => CupertinoActionSheet(
        actions: [
          CupertinoActionSheetAction(
            onPressed: () {
              Navigator.pop(ctx);
              _simulateDistraction();
            },
            child: const Text('Simulate distraction'),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          isDefaultAction: true,
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Cancel'),
        ),
      ),
    );
  }

  // ---- celebration ---------------------------------------------------------

  void _showCelebration(int durationSeconds) {
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    showCupertinoModalPopup<void>(
      context: context,
      barrierColor: QColors.bg.resolveFrom(context).withValues(alpha: 0.97),
      builder: (ctx) => _CelebrationOverlay(
        durationSeconds: durationSeconds,
        saves: _saves,
        reduceMotion: reduceMotion,
        taskTitle: widget.task?.title,
        onMarkDone: (widget.task != null && !widget.task!.done)
            ? () {
                HapticFeedback.mediumImpact();
                ref.read(tasksProvider.notifier).toggleDone(widget.task!);
                Navigator.pop(ctx); // celebration
                if (mounted) Navigator.of(context).pop(); // focus screen
              }
            : null,
        onDone: () {
          Navigator.pop(ctx); // celebration
          if (mounted) Navigator.of(context).pop(); // focus screen
        },
        onAnother: () {
          Navigator.pop(ctx);
          if (!mounted) return;
          setState(() {
            _totalSeconds = _defaultSeconds;
            _remaining = _defaultSeconds;
            _lapStartElapsed = 0;
            _saves = 0;
            _phase = _Phase.running;
          });
          _runTicker();
        },
      ),
    );
  }

  // ---- build ---------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    // Stopwatch look: progress fills as time elapses.
    final progress = _totalSeconds == 0 ? 0.0 : _elapsed / _totalSeconds;
    final title = widget.task?.title ?? 'Focus session';

    return CupertinoPageScaffold(
      backgroundColor: QColors.bg.resolveFrom(context),
      child: Stack(
        children: [
          GradientBackground(
            gradient: QGradients.warm,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: QSpace.lg),
                child: Column(
                  children: [
                    _TopBar(onClose: _requestClose, onMenu: _openMenu),
                    const Spacer(),
                    ClockFaceTimer(
                      progress: progress,
                      label: fmtHms(_elapsed),
                      size: math.min(
                          MediaQuery.of(context).size.width - 40, 360),
                      sublabel:
                          _phase == _Phase.paused ? 'Paused' : 'Deep Work',
                    ),
                    const SizedBox(height: QSpace.xl),
                    _TaskChip(title: title, hasTask: widget.task != null),
                    const SizedBox(height: QSpace.lg),
                    _LapTotalRow(
                      lap: _lapElapsed,
                      total: _elapsed,
                      lapStart: _lapStartElapsed,
                    ),
                    const SizedBox(height: QSpace.md),
                    _ProtectedRow(saves: _saves),
                    const Spacer(),
                    _TransportPill(
                      paused: _phase == _Phase.paused,
                      onPlayPause: _togglePause,
                      onRecord: _finish,
                      onReset: _reset,
                    ),
                    const SizedBox(height: QSpace.xl),
                  ],
                ),
              ),
            ),
          ),
          if (_showNudge)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: NudgeBanner(
                app: 'Instagram',
                minutes: 3,
                taskTitle: widget.task?.title ?? 'focus',
                onTap: _escalateToFriction,
                onDismiss: () => setState(() => _showNudge = false),
              ),
            ),
          if (_showFriction)
            Positioned.fill(
              child: FrictionOverlay(
                app: 'Instagram',
                todayMinutes: 12,
                weeklyAvgMinutes: 47,
                focusTasksEquivalent: 2,
                onTakeBreath: _takeBreath,
                onFiveMore: () => setState(() => _showFriction = false),
              ),
            ),
          if (_showBreak)
            Positioned.fill(
              child: _BreakOverlay(
                remaining: _breakRemaining,
                onSkip: _endBreak,
                onAddFive: () => setState(() => _breakRemaining += 5 * 60),
              ),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Top bar (close + menu)
// ---------------------------------------------------------------------------

class _TopBar extends StatelessWidget {
  const _TopBar({required this.onClose, required this.onMenu});
  final VoidCallback onClose;
  final VoidCallback onMenu;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: QSpace.xs),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _CircleGlassButton(icon: CupertinoIcons.xmark, onTap: onClose),
          _CircleGlassButton(
              icon: CupertinoIcons.ellipsis, onTap: onMenu),
        ],
      ),
    );
  }
}

class _CircleGlassButton extends StatelessWidget {
  const _CircleGlassButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: GlassSurface(
        radius: QRadius.capsule,
        child: SizedBox(
          width: 44,
          height: 44,
          child: Icon(icon, size: 20, color: CupertinoColors.white),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Task chip + protected row + control capsule
// ---------------------------------------------------------------------------

class _TaskChip extends StatelessWidget {
  const _TaskChip({required this.title, required this.hasTask});
  final String title;
  final bool hasTask;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.xs),
      decoration: BoxDecoration(
        color: CupertinoColors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(QRadius.capsule),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            hasTask
                ? CupertinoIcons.checkmark_square
                : CupertinoIcons.circle_grid_hex,
            size: 16,
            color: CupertinoColors.white.withValues(alpha: 0.9),
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              title,
              overflow: TextOverflow.ellipsis,
              style: QType.subhead.copyWith(
                fontWeight: FontWeight.w600,
                color: CupertinoColors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// "Lap Time / Total Time" — two columns, each with TWO tabular-figure rows
/// (current + a prior/last value), like a small lap list.
class _LapTotalRow extends StatelessWidget {
  const _LapTotalRow({
    required this.lap,
    required this.total,
    required this.lapStart,
  });
  final int lap;
  final int total;

  /// Elapsed at which the current lap began — used as the "previous" row.
  final int lapStart;

  @override
  Widget build(BuildContext context) {
    // Second row: for Lap show where the lap started; for Total show the
    // portion before the current lap. Kept simple + non-crashing.
    final prevTotal = (total - lap).clamp(0, total);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _TimeColumn(
          label: 'Lap Time',
          primary: fmtHms(lap),
          secondary: fmtHms(lapStart),
        ),
        Container(
          width: 1,
          height: 56,
          margin: const EdgeInsets.symmetric(horizontal: QSpace.xl),
          color: CupertinoColors.white.withValues(alpha: 0.2),
        ),
        _TimeColumn(
          label: 'Total Time',
          primary: fmtHms(total),
          secondary: fmtHms(prevTotal),
        ),
      ],
    );
  }
}

class _TimeColumn extends StatelessWidget {
  const _TimeColumn({
    required this.label,
    required this.primary,
    required this.secondary,
  });
  final String label;
  final String primary;
  final String secondary;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label.toUpperCase(),
          style: QType.caption.copyWith(
            letterSpacing: 1.0,
            fontWeight: FontWeight.w600,
            color: CupertinoColors.white.withValues(alpha: 0.6),
          ),
        ),
        const SizedBox(height: QSpace.xxs),
        Text(
          primary,
          style: QType.title3.copyWith(
            color: CupertinoColors.white,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
        const SizedBox(height: 2),
        Text(
          secondary,
          style: QType.subhead.copyWith(
            color: CupertinoColors.white.withValues(alpha: 0.55),
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}

class _ProtectedRow extends StatelessWidget {
  const _ProtectedRow({required this.saves});
  final int saves;

  @override
  Widget build(BuildContext context) {
    const white = CupertinoColors.white;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(CupertinoIcons.shield_fill,
            size: 15, color: white.withValues(alpha: 0.85)),
        const SizedBox(width: 6),
        Text('Protected · $saves saves',
            style: QType.subhead.copyWith(
                color: white.withValues(alpha: 0.85),
                fontWeight: FontWeight.w600)),
      ],
    );
  }
}

/// Translucent rounded pill holding three transport controls: play/pause
/// (outlined) · a white filled RECORD button with an orange dot · reset
/// (outlined circular arrow).
class _TransportPill extends StatelessWidget {
  const _TransportPill({
    required this.paused,
    required this.onPlayPause,
    required this.onRecord,
    required this.onReset,
  });
  final bool paused;
  final VoidCallback onPlayPause;
  final VoidCallback onRecord;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      radius: QRadius.capsule,
      child: Padding(
        padding: const EdgeInsets.symmetric(
            horizontal: QSpace.xl, vertical: QSpace.md),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _OutlinedControl(
              icon: paused ? CupertinoIcons.play_fill : CupertinoIcons.pause_fill,
              onTap: onPlayPause,
            ),
            const SizedBox(width: QSpace.xl),
            _RecordButton(onTap: onRecord),
            const SizedBox(width: QSpace.xl),
            _OutlinedControl(
              icon: CupertinoIcons.arrow_counterclockwise,
              onTap: onReset,
            ),
          ],
        ),
      ),
    );
  }
}

/// A thin white-outlined round control (play / reset).
class _OutlinedControl extends StatelessWidget {
  const _OutlinedControl({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 52,
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: CupertinoColors.white.withValues(alpha: 0.85),
            width: 1.5,
          ),
        ),
        child: Icon(icon, size: 22, color: CupertinoColors.white),
      ),
    );
  }
}

/// White filled RECORD button with a centered orange dot.
class _RecordButton extends StatelessWidget {
  const _RecordButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 64,
        height: 64,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: CupertinoColors.white,
        ),
        child: Container(
          width: 22,
          height: 22,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Color(0xFFF37A1E),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Celebration overlay
// ---------------------------------------------------------------------------

class _CelebrationOverlay extends StatelessWidget {
  const _CelebrationOverlay({
    required this.durationSeconds,
    required this.saves,
    required this.reduceMotion,
    required this.onDone,
    required this.onAnother,
    this.taskTitle,
    this.onMarkDone,
  });
  final int durationSeconds;
  final int saves;
  final bool reduceMotion;
  final VoidCallback onDone;
  final VoidCallback onAnother;
  final String? taskTitle;
  final VoidCallback? onMarkDone;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(QSpace.lg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 96,
              child: reduceMotion
                  ? Center(
                      child: Icon(CupertinoIcons.checkmark_seal_fill,
                          size: 72,
                          color: QColors.wellbeing.resolveFrom(context)),
                    )
                  : const _Confetti(),
            ),
            const SizedBox(height: QSpace.md),
            Text('Session complete',
                style: QType.title1, textAlign: TextAlign.center),
            const SizedBox(height: QSpace.xs),
            Text(
              taskTitle == null
                  ? 'You focused for ${fmtHm(durationSeconds)}.'
                  : 'You focused for ${fmtHm(durationSeconds)} on “$taskTitle”.',
              style: QType.body
                  .copyWith(color: QColors.labelSecondary.resolveFrom(context)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: QSpace.xl),
            Row(
              children: [
                Expanded(
                    child: _StatCard(
                        icon: CupertinoIcons.shield_fill,
                        value: '$saves',
                        label: 'Saves',
                        color: QColors.wellbeing)),
                const SizedBox(width: QSpace.sm),
                Expanded(
                    child: _StatCard(
                        icon: CupertinoIcons.chart_bar_fill,
                        value: '${Mock.productivityScore}',
                        label: 'Score',
                        color: QColors.focus)),
                const SizedBox(width: QSpace.sm),
                Expanded(
                    child: _StatCard(
                        icon: CupertinoIcons.flame_fill,
                        value: '${Mock.streakDays}',
                        label: 'Streak',
                        color: QColors.breakColor)),
              ],
            ),
            const SizedBox(height: QSpace.xl),
            if (onMarkDone != null) ...[
              PrimaryButton(
                label: 'Mark task complete',
                icon: CupertinoIcons.checkmark_alt,
                color: QColors.wellbeing,
                onPressed: onMarkDone,
              ),
              const SizedBox(height: QSpace.sm),
              PrimaryButton(label: 'Keep it open', style: QButtonStyle.tinted, onPressed: onDone),
            ] else ...[
              PrimaryButton(label: 'Done', onPressed: onDone),
              const SizedBox(height: QSpace.sm),
              PrimaryButton(
                label: 'Start another',
                style: QButtonStyle.tinted,
                onPressed: onAnother,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final c = color.resolveFrom(context);
    return GlassCard(
      padding: const EdgeInsets.symmetric(vertical: QSpace.md),
      child: Column(
        children: [
          Icon(icon, size: 20, color: c),
          const SizedBox(height: QSpace.xs),
          Text(value,
              style: QType.title2.copyWith(
                fontFeatures: const [FontFeature.tabularFigures()],
              )),
          Text(label, style: QType.caption),
        ],
      ),
    );
  }
}

/// Lightweight static "confetti" burst (respects reduce motion at call site).
class _Confetti extends StatelessWidget {
  const _Confetti();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _ConfettiPainter(),
      child: Center(
        child: Icon(CupertinoIcons.checkmark_seal_fill,
            size: 64, color: QColors.wellbeing.resolveFrom(context)),
      ),
    );
  }
}

class _ConfettiPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rnd = math.Random(7);
    final colors = QColors.workspacePalette;
    final center = size.center(Offset.zero);
    for (var i = 0; i < 26; i++) {
      final angle = rnd.nextDouble() * 2 * math.pi;
      final dist = 20 + rnd.nextDouble() * (size.width / 2 - 10);
      final p = center + Offset(math.cos(angle), math.sin(angle) * 0.6) * dist;
      final paint = Paint()
        ..color = colors[i % colors.length].withValues(alpha: 0.9);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(center: p, width: 6, height: 3),
          const Radius.circular(1.5),
        ),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ConfettiPainter old) => false;
}

// ---------------------------------------------------------------------------
// Pomodoro break overlay
// ---------------------------------------------------------------------------

class _BreakOverlay extends StatelessWidget {
  const _BreakOverlay({
    required this.remaining,
    required this.onSkip,
    required this.onAddFive,
  });
  final int remaining;
  final VoidCallback onSkip;
  final VoidCallback onAddFive;

  @override
  Widget build(BuildContext context) {
    final orange = QColors.breakColor.resolveFrom(context);
    return DecoratedBox(
      decoration: BoxDecoration(color: orange.withValues(alpha: 0.97)),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(QSpace.lg),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(CupertinoIcons.leaf_arrow_circlepath,
                  size: 44, color: CupertinoColors.white),
              const SizedBox(height: QSpace.md),
              Text('Break time',
                  style: QType.title1.copyWith(color: CupertinoColors.white),
                  textAlign: TextAlign.center),
              const SizedBox(height: QSpace.xs),
              Text('Rest your eyes. You earned it.',
                  style: QType.body.copyWith(
                      color: CupertinoColors.white.withValues(alpha: 0.9)),
                  textAlign: TextAlign.center),
              const SizedBox(height: QSpace.xl),
              Text(
                fmtClock(remaining),
                style: QType.timer
                    .copyWith(fontSize: 72, color: CupertinoColors.white),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: QSpace.xxl),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: CupertinoButton(
                  color: CupertinoColors.white,
                  borderRadius: BorderRadius.circular(QRadius.capsule),
                  onPressed: () {
                    HapticFeedback.selectionClick();
                    onAddFive();
                  },
                  child: Text('+5 min',
                      style: QType.headline.copyWith(color: orange)),
                ),
              ),
              const SizedBox(height: QSpace.sm),
              CupertinoButton(
                onPressed: () {
                  HapticFeedback.lightImpact();
                  onSkip();
                },
                child: Text('Skip',
                    style:
                        QType.headline.copyWith(color: CupertinoColors.white)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
