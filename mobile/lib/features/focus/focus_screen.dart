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

/// The one immersive color moment of the app — a deep flame ground for the
/// focus session. Hotter and more urgent than the ember home surface: near-black
/// root → deep flame → bright flame. This is the section's single hero surface;
/// everything on top stays neutral white ink + the flame accent used sparingly.
const _flameGround = LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [
    Color(0xFF2A0A03), // near-black flame root
    Color(0xFF7A1E08), // deep flame
    Color(0xFFC93318), // flame
    Color(0xFFF5482B), // bright flame (section accent)
  ],
  stops: [0.0, 0.34, 0.72, 1.0],
);

class _FocusScreenState extends ConsumerState<FocusScreen>
    with SingleTickerProviderStateMixin {
  static const _defaultSeconds = 25 * 60; // one Pomodoro-style work block
  static const _breakSeconds = 5 * 60;

  /// The SIGNATURE moment — a one-shot orchestrated ignition on session start:
  /// the ground calms toward near-black while the ring blooms an ember halo.
  /// Gated on Reduce Motion (jumps to settled). Runs exactly once, on entry.
  late final AnimationController _igniteCtrl;

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
    _igniteCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    );
    _runTicker();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Fire the ignition exactly once, after MediaQuery (Reduce Motion) is ready.
    if (_igniteCtrl.status == AnimationStatus.dismissed &&
        _igniteCtrl.value == 0) {
      if (QMotion.reduced(context)) {
        _igniteCtrl.value = 1.0; // settled, no motion
      } else {
        _igniteCtrl.forward();
      }
    }
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
    _igniteCtrl.dispose();
    super.dispose();
  }

  int get _elapsed => _totalSeconds - _remaining;

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
        // Soft ticks in the final 3s (skip 0 — completion has its own beat).
        if (_remaining > 0 && _remaining <= 3) {
          HapticFeedback.selectionClick();
        }
      } else {
        _onTimeUp();
      }
    });
  }

  void _onTimeUp() {
    _ticker?.cancel();
    // Success beat at natural block completion (previously silent).
    HapticFeedback.mediumImpact();
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
      _phase = _Phase.running;
    });
    _runTicker();
  }

  Future<void> _finish() async {
    _ticker?.cancel();
    HapticFeedback.mediumImpact();
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
    // A calm resolution — soft, not a thud.
    HapticFeedback.lightImpact();
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
      // Non-dismissible: don't let a tap-away skip the win.
      barrierDismissible: false,
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
    // Countdown: the ring DRAINS as time remaining shrinks (remaining/total).
    final progress = _totalSeconds == 0 ? 0.0 : _remaining / _totalSeconds;
    final paused = _phase == _Phase.paused;
    final title = widget.task?.title ?? 'Focus session';

    return CupertinoPageScaffold(
      backgroundColor: QColors.bg.resolveFrom(context),
      child: Stack(
        children: [
          AnimatedBuilder(
            animation: _igniteCtrl,
            builder: (context, child) {
              // t: 0 at entry → 1 settled. The ground calms toward near-black
              // as the session takes hold; the ring halo blooms then recedes.
              final t = Curves.easeOutCubic.transform(_igniteCtrl.value);
              // Halo blooms in fast, then eases back down to a resting ember.
              final ignite = math.sin(t * math.pi) * 0.85 + t * 0.15;
              return Stack(
                fit: StackFit.expand,
                children: [
                  const DecoratedBox(
                    decoration: BoxDecoration(gradient: _flameGround),
                    child: SizedBox.expand(),
                  ),
                  // Calming veil: darkens the warm ground toward near-black so
                  // the ignited ring becomes the single focal point.
                  IgnorePointer(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: CupertinoColors.black.withValues(alpha: 0.34 * t),
                      ),
                    ),
                  ),
                  _FocusBody(
                    progress: progress,
                    remaining: _remaining,
                    paused: paused,
                    ignite: ignite,
                    title: title,
                    hasTask: widget.task != null,
                    saves: _saves,
                    onClose: _requestClose,
                    onMenu: _openMenu,
                    onPlayPause: _togglePause,
                    onFinish: _finish,
                    onReset: _reset,
                  ),
                ],
              );
            },
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
// Focus body — the ring, task chip, protected row, transport pill.
// ---------------------------------------------------------------------------

class _FocusBody extends StatelessWidget {
  const _FocusBody({
    required this.progress,
    required this.remaining,
    required this.paused,
    required this.ignite,
    required this.title,
    required this.hasTask,
    required this.saves,
    required this.onClose,
    required this.onMenu,
    required this.onPlayPause,
    required this.onFinish,
    required this.onReset,
  });

  final double progress;
  final int remaining;
  final bool paused;
  final double ignite;
  final String title;
  final bool hasTask;
  final int saves;
  final VoidCallback onClose;
  final VoidCallback onMenu;
  final VoidCallback onPlayPause;
  final VoidCallback onFinish;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: QSpace.lg),
        child: Column(
          children: [
            _TopBar(onClose: onClose, onMenu: onMenu),
            const Spacer(flex: 3),
            ClockFaceTimer(
              // Primary numeral is REMAINING time (a countdown).
              progress: progress,
              label: fmtHms(remaining),
              paused: paused,
              ignite: ignite,
              size: math.min(MediaQuery.of(context).size.width - 40, 360),
              sublabel: paused ? 'Paused' : 'Deep Work',
            ),
            const SizedBox(height: QSpace.xxl),
            _TaskChip(title: title, hasTask: hasTask),
            const SizedBox(height: QSpace.sm),
            _ProtectedRow(saves: saves),
            const Spacer(flex: 4),
            _TransportPill(
              paused: paused,
              onPlayPause: onPlayPause,
              onFinish: onFinish,
              onReset: onReset,
            ),
            const SizedBox(height: QSpace.xl),
          ],
        ),
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
/// (outlined) · a filled DONE/FINISH button (ember checkmark) · reset
/// (outlined circular arrow). No stopwatch "record" — this is a focus session.
class _TransportPill extends StatelessWidget {
  const _TransportPill({
    required this.paused,
    required this.onPlayPause,
    required this.onFinish,
    required this.onReset,
  });
  final bool paused;
  final VoidCallback onPlayPause;
  final VoidCallback onFinish;
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
            _FinishButton(onTap: onFinish),
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

/// White filled FINISH button with an ember checkmark — end the session, log
/// it, and celebrate. Unambiguous "done", not a stopwatch record dot.
class _FinishButton extends StatelessWidget {
  const _FinishButton({required this.onTap});
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
        child: Icon(
          CupertinoIcons.checkmark_alt,
          size: 32,
          color: QSection.focus.resolveFrom(context),
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
    final brightness =
        MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;
    // Faint flame-tinted ambient wash so the frosted stat cards have something
    // to refract; fades to the neutral grouped page bg — keeps the airy feel.
    return GradientBackground(
      gradient: QGradients.ambient(
        QSection.focus.resolveFrom(context),
        brightness,
      ),
      child: SafeArea(
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
              Text(
                'FOCUS SESSION',
                style: QType.eyebrow.copyWith(
                  color: QSection.focus.resolveFrom(context),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: QSpace.xs),
              Text('Session complete',
                  style: QType.title1, textAlign: TextAlign.center),
              const SizedBox(height: QSpace.xs),
              Text(
                taskTitle == null
                    ? 'You focused for ${fmtHm(durationSeconds)}.'
                    : 'You focused for ${fmtHm(durationSeconds)} on “$taskTitle”.',
                style: QType.body.copyWith(
                    color: QColors.labelSecondary.resolveFrom(context)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: QSpace.xl),
              Row(
                children: [
                  Expanded(
                      child: _StatCard(
                          icon: CupertinoIcons.timer,
                          value: fmtHm(durationSeconds),
                          label: 'Focused',
                          color: QSection.focus)),
                  const SizedBox(width: QSpace.sm),
                  Expanded(
                      child: _StatCard(
                          icon: CupertinoIcons.shield_fill,
                          value: '$saves',
                          label: 'Saves',
                          color: QColors.wellbeing)),
                  const SizedBox(width: QSpace.sm),
                  Expanded(
                      child: _StatCard(
                          icon: CupertinoIcons.flame_fill,
                          value: '${Mock.streakDays}',
                          label: 'Streak',
                          color: QSection.focus)),
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
                PrimaryButton(
                    label: 'Keep it open',
                    style: QButtonStyle.tinted,
                    onPressed: onDone),
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
    // Frosted content material — a whisper of the flame section tint refracts
    // the ambient wash behind the celebration; neutral ink stays legible.
    return GlassCard(
      tint: QSection.focus.resolveFrom(context),
      padding: const EdgeInsets.symmetric(vertical: QSpace.md),
      child: Column(
        children: [
          Icon(icon, size: 20, color: c),
          const SizedBox(height: QSpace.xs),
          Text(value,
              style: QType.title2.copyWith(
                fontFeatures: const [FontFeature.tabularFigures()],
              )),
          const SizedBox(height: 2),
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
    // Break is a different, cooler room — teal identity, not louder orange.
    final teal = QColors.breakColor.resolveFrom(context);
    return DecoratedBox(
      decoration: const BoxDecoration(gradient: QGradients.cool),
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
              Text(
                'A COOLER ROOM',
                style: QType.eyebrow.copyWith(
                  color: CupertinoColors.white.withValues(alpha: 0.7),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: QSpace.xs),
              Text('Break time',
                  style: QType.title1.copyWith(color: CupertinoColors.white),
                  textAlign: TextAlign.center),
              const SizedBox(height: QSpace.xs),
              Text('Rest your eyes. You earned it.',
                  style: QType.body.copyWith(
                      color: CupertinoColors.white.withValues(alpha: 0.9)),
                  textAlign: TextAlign.center),
              const SizedBox(height: QSpace.xxl),
              // Huge, clean tabular break countdown.
              Text(
                fmtClock(remaining),
                style: QType.timer.copyWith(
                  fontSize: 76,
                  fontWeight: FontWeight.w500,
                  letterSpacing: -2.0,
                  color: CupertinoColors.white,
                ),
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
                      style: QType.headline.copyWith(color: teal)),
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
