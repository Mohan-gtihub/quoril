import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/data/providers.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/theme/gradients.dart';
import '../../core/widgets/primary_button.dart';

// ── Warm Aurora foreground palette (over QGradients.warm) ────────────────────
const Color _fgPrimary = CupertinoColors.white;
final Color _fgSecondary = CupertinoColors.white.withValues(alpha: 0.78);
final Color _glassBorder = CupertinoColors.white.withValues(alpha: 0.24);

/// Auth entry point — native iOS Sign In / Create Account wired to Supabase.
///
/// On success we do NOT navigate: the AuthGate reacts to the auth-state stream.
/// We only pop any open sheets. Errors surface inline + as a native alert with
/// a heavy haptic.
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

enum _AuthMode { signIn, signUp }

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _passwordFocus = FocusNode();

  _AuthMode _mode = _AuthMode.signIn;
  bool _obscure = true;
  bool _loading = false;

  String? _emailError;
  String? _passwordError;

  @override
  void initState() {
    super.initState();
    // Live-update password rule hints while typing on Sign Up.
    _passwordCtrl.addListener(() {
      if (_mode == _AuthMode.signUp && mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  bool get _isSignUp => _mode == _AuthMode.signUp;

  void _setMode(_AuthMode m) {
    if (_mode == m) return;
    HapticFeedback.selectionClick();
    setState(() {
      _mode = m;
      _emailError = null;
      _passwordError = null;
    });
  }

  bool _validEmail(String v) =>
      RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v.trim());

  // Password rule checks (used for both hints and Sign Up validation).
  bool _ruleLength(String v) => v.length >= 12;
  bool _ruleMixedCase(String v) =>
      v.contains(RegExp(r'[a-z]')) && v.contains(RegExp(r'[A-Z]'));
  bool _ruleNumber(String v) => v.contains(RegExp(r'[0-9]'));
  bool _ruleSpecial(String v) =>
      v.contains(RegExp(r'[!@#\$%^&*(),.?":{}|<>_\-\[\]/\\+=~`]'));

  bool _passwordMeetsRules(String v) =>
      _ruleLength(v) && _ruleMixedCase(v) && _ruleNumber(v) && _ruleSpecial(v);

  /// Client-side validation. Returns true when the form is clean.
  bool _validate() {
    final email = _emailCtrl.text.trim();
    final pass = _passwordCtrl.text;

    String? emailErr;
    String? passErr;

    if (email.isEmpty) {
      emailErr = 'Email is required';
    } else if (!_validEmail(email)) {
      emailErr = 'Enter a valid email address';
    }

    if (pass.isEmpty) {
      passErr = 'Password is required';
    } else if (_isSignUp && !_passwordMeetsRules(pass)) {
      passErr = 'Password doesn’t meet the requirements';
    } else if (!_isSignUp && pass.length < 6) {
      passErr = 'Password is too short';
    }

    if (emailErr != null || passErr != null) {
      HapticFeedback.mediumImpact();
      setState(() {
        _emailError = emailErr;
        _passwordError = passErr;
      });
      return false;
    }
    setState(() {
      _emailError = null;
      _passwordError = null;
    });
    return true;
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!_validate()) return;

    final auth = ref.read(authServiceProvider);
    final email = _emailCtrl.text.trim();
    final pass = _passwordCtrl.text;

    HapticFeedback.lightImpact();
    setState(() => _loading = true);
    try {
      if (_isSignUp) {
        await auth.signUp(email, pass);
      } else {
        await auth.signIn(email, pass);
      }
      if (!mounted) return;
      // Do NOT navigate — the AuthGate reacts to auth state.
    } on AuthException catch (e) {
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      setState(() => _passwordError = e.message);
      _showErrorAlert(e.message);
    } catch (e) {
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      _showErrorAlert('Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _continueWithGoogle() async {
    final auth = ref.read(authServiceProvider);
    HapticFeedback.lightImpact();
    setState(() => _loading = true);
    try {
      await auth.signInWithGoogle();
      // OAuth continues in a browser; AuthGate handles the returned session.
    } on AuthException catch (e) {
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      _showErrorAlert(e.message);
    } catch (e) {
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      _showErrorAlert('Could not start Google sign-in. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showErrorAlert(String message) {
    showCupertinoDialog<void>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Sign-in failed'),
        content: Padding(
          padding: const EdgeInsets.only(top: QSpace.xs),
          child: Text(message),
        ),
        actions: [
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _openForgotSheet() {
    HapticFeedback.selectionClick();
    showCupertinoModalPopup<void>(
      context: context,
      builder: (_) => _ForgotPasswordSheet(initialEmail: _emailCtrl.text.trim()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: GradientBackground(
        gradient: QGradients.warm,
        child: SafeArea(
          bottom: false,
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                      QSpace.lg, QSpace.xl, QSpace.lg, QSpace.xxl),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildWordmark(context),
                      const SizedBox(height: QSpace.lg),
                  _buildModeToggle(context),
                  const SizedBox(height: QSpace.xl),
                  _buildFields(context),
                  AnimatedSize(
                    duration: MediaQuery.of(context).disableAnimations
                        ? Duration.zero
                        : QMotion.fast,
                    curve: QMotion.standard,
                    child: _isSignUp
                        ? Padding(
                            padding: const EdgeInsets.only(top: QSpace.md),
                            child: _PasswordRules(
                              length: _ruleLength(_passwordCtrl.text),
                              mixedCase: _ruleMixedCase(_passwordCtrl.text),
                              number: _ruleNumber(_passwordCtrl.text),
                              special: _ruleSpecial(_passwordCtrl.text),
                            ),
                          )
                        : const SizedBox.shrink(),
                  ),
                  const SizedBox(height: QSpace.xl),
                  PrimaryButton(
                    label: _isSignUp ? 'Create Account' : 'Sign In',
                    color: CupertinoColors.white,
                    foreground: const Color(0xFF2A0A06),
                    loading: _loading,
                    onPressed: _loading ? null : _submit,
                  ),
                  const SizedBox(height: QSpace.xl),
                  _buildDivider(context),
                  const SizedBox(height: QSpace.xl),
                  _GoogleButton(
                    onPressed: _loading ? null : _continueWithGoogle,
                  ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWordmark(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Compact brand row — mark + wordmark, left-aligned (editorial, not a
        // centered logo box).
        Row(
          children: [
            Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: CupertinoColors.white.withValues(alpha: 0.16),
                border: Border.all(color: _glassBorder, width: 1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(CupertinoIcons.bolt_fill,
                  size: 18, color: CupertinoColors.white),
            ),
            const SizedBox(width: QSpace.xs),
            Text(
              'Quoril',
              style: QType.headline.copyWith(
                color: _fgPrimary,
                letterSpacing: 0.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: QSpace.xl),
        Text(
          _isSignUp ? 'Create your\naccount.' : 'Welcome\nback.',
          style: QType.largeTitle.copyWith(
            color: _fgPrimary,
            fontSize: 40,
            height: 1.05,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: QSpace.sm),
        Text(
          _isSignUp
              ? 'Set up your space to focus deeply and keep distractions out.'
              : 'Pick up right where your focus left off.',
          style: QType.body.copyWith(color: _fgSecondary, height: 1.3),
        ),
      ],
    );
  }

  Widget _buildModeToggle(BuildContext context) {
    Widget seg(_AuthMode m, String label) => Padding(
          padding: const EdgeInsets.symmetric(vertical: QSpace.xs),
          child: Text(
            label,
            style: QType.subhead.copyWith(
              // White frosted thumb → dark warm ink when selected; translucent
              // white when not. Keeps the amber accent reserved for elsewhere.
              color: _mode == m ? const Color(0xFF2A0A06) : _fgSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
        );
    return CupertinoSlidingSegmentedControl<_AuthMode>(
      groupValue: _mode,
      backgroundColor: CupertinoColors.white.withValues(alpha: 0.12),
      thumbColor: CupertinoColors.white,
      onValueChanged: (m) {
        if (m != null) _setMode(m);
      },
      children: {
        _AuthMode.signIn: seg(_AuthMode.signIn, 'Sign In'),
        _AuthMode.signUp: seg(_AuthMode.signUp, 'Create Account'),
      },
    );
  }

  Widget _buildFields(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _AuthField(
          controller: _emailCtrl,
          onGradient: true,
          placeholder: 'Email',
          icon: CupertinoIcons.mail,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.email],
          errorText: _emailError,
          onSubmitted: (_) => _passwordFocus.requestFocus(),
          onChanged: (_) {
            if (_emailError != null) setState(() => _emailError = null);
          },
        ),
        const SizedBox(height: QSpace.md),
        _AuthField(
          controller: _passwordCtrl,
          focusNode: _passwordFocus,
          onGradient: true,
          placeholder: 'Password',
          icon: CupertinoIcons.lock,
          obscure: _obscure,
          textInputAction: TextInputAction.done,
          autofillHints: _isSignUp
              ? const [AutofillHints.newPassword]
              : const [AutofillHints.password],
          errorText: _passwordError,
          onSubmitted: (_) {
            if (!_loading) _submit();
          },
          onChanged: (_) {
            if (_passwordError != null) setState(() => _passwordError = null);
          },
          trailing: CupertinoButton(
            padding: EdgeInsets.zero,
            minimumSize: const Size(0, 0),
            onPressed: () {
              HapticFeedback.selectionClick();
              setState(() => _obscure = !_obscure);
            },
            child: Icon(
              _obscure ? CupertinoIcons.eye : CupertinoIcons.eye_slash,
              size: 20,
              color: _fgSecondary,
            ),
          ),
        ),
        if (!_isSignUp) ...[
          const SizedBox(height: QSpace.sm),
          Align(
            alignment: Alignment.centerRight,
            child: CupertinoButton(
              padding: EdgeInsets.zero,
              minimumSize: const Size(0, 0),
              onPressed: _openForgotSheet,
              child: Text(
                'Forgot password?',
                style: QType.footnote.copyWith(
                  color: _fgPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDivider(BuildContext context) {
    final sep = CupertinoColors.white.withValues(alpha: 0.24);
    return Row(
      children: [
        Expanded(child: Container(height: 1, color: sep)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
          child: Text('or', style: QType.footnote.copyWith(color: _fgSecondary)),
        ),
        Expanded(child: Container(height: 1, color: sep)),
      ],
    );
  }
}

/// Inset field styled like a grouped list row — 44pt tall.
class _AuthField extends StatelessWidget {
  const _AuthField({
    required this.controller,
    required this.placeholder,
    required this.icon,
    this.focusNode,
    this.obscure = false,
    this.onGradient = false,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.errorText,
    this.onChanged,
    this.onSubmitted,
    this.trailing,
  });

  final TextEditingController controller;
  final FocusNode? focusNode;
  final String placeholder;
  final IconData icon;
  final bool obscure;

  /// Frosted-glass styling for use over a colored gradient (white ink).
  final bool onGradient;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final String? errorText;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final hasError = errorText != null;
    const errorInk = Color(0xFFFFC2B5); // light red that reads on the gradient

    final Color fill;
    final Color borderColor;
    final Color iconColor;
    final Color textColor;
    final Color placeholderColor;
    final Color errorTextColor;
    if (onGradient) {
      fill = CupertinoColors.white.withValues(alpha: 0.12);
      borderColor = hasError
          ? errorInk
          : CupertinoColors.white.withValues(alpha: 0.22);
      iconColor = CupertinoColors.white.withValues(alpha: 0.7);
      textColor = CupertinoColors.white;
      placeholderColor = CupertinoColors.white.withValues(alpha: 0.45);
      errorTextColor = errorInk;
    } else {
      fill = QColors.surface.resolveFrom(context);
      borderColor = (hasError
              ? QColors.danger.resolveFrom(context)
              : QColors.separator.resolveFrom(context))
          .withValues(alpha: hasError ? 1.0 : 0.6);
      iconColor = QColors.labelSecondary.resolveFrom(context);
      textColor = QColors.label.resolveFrom(context);
      placeholderColor = QColors.labelTertiary.resolveFrom(context);
      errorTextColor = QColors.danger.resolveFrom(context);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          constraints: const BoxConstraints(minHeight: 52),
          decoration: BoxDecoration(
            color: fill,
            borderRadius: BorderRadius.circular(QRadius.row),
            border: Border.all(
              color: borderColor,
              width: hasError ? 1.5 : 1,
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: QSpace.sm),
          child: Row(
            children: [
              Icon(icon, size: 20, color: iconColor),
              const SizedBox(width: QSpace.sm),
              Expanded(
                child: CupertinoTextField.borderless(
                  controller: controller,
                  focusNode: focusNode,
                  placeholder: placeholder,
                  obscureText: obscure,
                  keyboardType: keyboardType,
                  textInputAction: textInputAction,
                  autofillHints: autofillHints,
                  onChanged: onChanged,
                  onSubmitted: onSubmitted,
                  cursorColor: onGradient ? CupertinoColors.white : null,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  style: QType.body.copyWith(color: textColor),
                  placeholderStyle:
                      QType.body.copyWith(color: placeholderColor),
                ),
              ),
              if (trailing != null) ...[
                const SizedBox(width: QSpace.xs),
                trailing!,
              ],
            ],
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: QSpace.xs),
          Padding(
            padding: const EdgeInsets.only(left: QSpace.xxs),
            child: Text(
              errorText!,
              style: QType.caption.copyWith(color: errorTextColor),
            ),
          ),
        ],
      ],
    );
  }
}

/// Inline password requirement hints for Sign Up.
class _PasswordRules extends StatelessWidget {
  const _PasswordRules({
    required this.length,
    required this.mixedCase,
    required this.number,
    required this.special,
  });

  final bool length;
  final bool mixedCase;
  final bool number;
  final bool special;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _rule(context, '12+ characters', length),
        _rule(context, 'Upper & lowercase letters', mixedCase),
        _rule(context, 'At least one number', number),
        _rule(context, 'At least one special character', special),
      ],
    );
  }

  Widget _rule(BuildContext context, String label, bool met) {
    // On the warm gradient: met = white check, unmet = dim white.
    final iconColor = met
        ? CupertinoColors.white
        : CupertinoColors.white.withValues(alpha: 0.4);
    final textColor = met
        ? CupertinoColors.white.withValues(alpha: 0.92)
        : CupertinoColors.white.withValues(alpha: 0.55);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Icon(
            met ? CupertinoIcons.checkmark_circle_fill : CupertinoIcons.circle,
            size: 16,
            color: iconColor,
          ),
          const SizedBox(width: QSpace.xs),
          Text(label, style: QType.footnote.copyWith(color: textColor)),
        ],
      ),
    );
  }
}

/// Bordered "Continue with Google" button with a Google glyph.
class _GoogleButton extends StatelessWidget {
  const _GoogleButton({required this.onPressed});
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: CupertinoButton(
        padding: EdgeInsets.zero,
        borderRadius: BorderRadius.circular(QRadius.capsule),
        color: CupertinoColors.white.withValues(alpha: 0.12),
        onPressed: onPressed,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(QRadius.capsule),
            border: Border.all(
              color: CupertinoColors.white.withValues(alpha: 0.22),
              width: 1,
            ),
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // White chip keeps Google's multi-color 'G' legible on glass.
              Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: CupertinoColors.white,
                  shape: BoxShape.circle,
                ),
                child: const _GoogleGlyph(size: 16),
              ),
              const SizedBox(width: QSpace.sm),
              Text(
                'Continue with Google',
                style: QType.headline.copyWith(color: CupertinoColors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Multi-color Google "G" glyph drawn with CustomPaint (no asset dependency).
class _GoogleGlyph extends StatelessWidget {
  const _GoogleGlyph({this.size = 20});
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _GoogleGlyphPainter()),
    );
  }
}

class _GoogleGlyphPainter extends CustomPainter {
  static const _blue = Color(0xFF4285F4);
  static const _red = Color(0xFFEA4335);
  static const _yellow = Color(0xFFFBBC05);
  static const _green = Color(0xFF34A853);

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final stroke = w * 0.22;
    final rect = Rect.fromLTWH(stroke / 2, stroke / 2, w - stroke, h - stroke);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.butt;

    paint.color = _red;
    canvas.drawArc(rect, _deg(-45), _deg(-90), false, paint);
    paint.color = _yellow;
    canvas.drawArc(rect, _deg(135), _deg(90), false, paint);
    paint.color = _green;
    canvas.drawArc(rect, _deg(45), _deg(90), false, paint);
    paint.color = _blue;
    canvas.drawArc(rect, _deg(-45), _deg(85), false, paint);

    final barPaint = Paint()..color = _blue;
    canvas.drawRect(
      Rect.fromLTWH(w * 0.52, h * 0.42, w * 0.46, stroke),
      barPaint,
    );
  }

  double _deg(double d) => d * 3.1415926535 / 180;

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Bottom sheet for password reset — calls resetPassword on the real service.
class _ForgotPasswordSheet extends ConsumerStatefulWidget {
  const _ForgotPasswordSheet({this.initialEmail = ''});
  final String initialEmail;

  @override
  ConsumerState<_ForgotPasswordSheet> createState() =>
      _ForgotPasswordSheetState();
}

class _ForgotPasswordSheetState extends ConsumerState<_ForgotPasswordSheet> {
  late final TextEditingController _emailCtrl =
      TextEditingController(text: widget.initialEmail);
  bool _loading = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  bool _validEmail(String v) =>
      RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v.trim());

  Future<void> _send() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty || !_validEmail(email)) {
      HapticFeedback.mediumImpact();
      setState(() => _error =
          email.isEmpty ? 'Email is required' : 'Enter a valid email address');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      await ref.read(authServiceProvider).resetPassword(email);
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      setState(() {
        _loading = false;
        _sent = true;
      });
    } on AuthException catch (e) {
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      setState(() {
        _loading = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      setState(() {
        _loading = false;
        _error = 'Could not send the reset link. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      decoration: BoxDecoration(
        color: QColors.bgGrouped.resolveFrom(context),
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(QRadius.glass),
        ),
      ),
      padding: EdgeInsets.only(
        left: QSpace.lg,
        right: QSpace.lg,
        top: QSpace.sm,
        bottom: QSpace.xl + bottomInset,
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 5,
                margin: const EdgeInsets.only(bottom: QSpace.lg),
                decoration: BoxDecoration(
                  color: QColors.tertiaryFill.resolveFrom(context),
                  borderRadius: BorderRadius.circular(QRadius.capsule),
                ),
              ),
            ),
            if (_sent) _buildSuccess(context) else _buildForm(context),
          ],
        ),
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Reset password', style: QType.title2),
        const SizedBox(height: QSpace.xs),
        Text(
          'Enter your account email and we’ll send you a link to reset your password.',
          style: QType.subhead,
        ),
        const SizedBox(height: QSpace.lg),
        _AuthField(
          controller: _emailCtrl,
          placeholder: 'Email',
          icon: CupertinoIcons.mail,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.done,
          autofillHints: const [AutofillHints.email],
          errorText: _error,
          onSubmitted: (_) {
            if (!_loading) _send();
          },
          onChanged: (_) {
            if (_error != null) setState(() => _error = null);
          },
        ),
        const SizedBox(height: QSpace.lg),
        PrimaryButton(
          label: 'Send reset link',
          loading: _loading,
          onPressed: _loading ? null : _send,
        ),
        const SizedBox(height: QSpace.xs),
        PrimaryButton(
          label: 'Cancel',
          style: QButtonStyle.plain,
          onPressed: _loading ? null : () => Navigator.pop(context),
        ),
      ],
    );
  }

  Widget _buildSuccess(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Icon(
            CupertinoIcons.checkmark_circle_fill,
            size: 56,
            color: QColors.wellbeing.resolveFrom(context),
          ),
        ),
        const SizedBox(height: QSpace.md),
        Text('Check your inbox',
            style: QType.title2, textAlign: TextAlign.center),
        const SizedBox(height: QSpace.xs),
        Text(
          'We sent a reset link to ${_emailCtrl.text.trim()}. Follow it to choose a new password.',
          style: QType.subhead,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: QSpace.lg),
        PrimaryButton(
          label: 'Done',
          onPressed: () => Navigator.pop(context),
        ),
      ],
    );
  }
}
