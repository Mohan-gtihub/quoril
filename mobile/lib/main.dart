import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/config.dart';
import 'core/data/providers.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/sign_in_screen.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/settings/theme_mode_provider.dart';
import 'features/shell/app_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Guard init so a failure here (bad network, Supabase down) can never leave
  // main() throwing before runApp — that produces a silent black screen with
  // no error surface. Instead we always mount the app; auth simply starts in a
  // signed-out state and retries when connectivity returns.
  try {
    await Supabase.initialize(
      url: QConfig.supabaseUrl,
      // `publishableKey` supersedes the deprecated `anonKey`; the config value is
      // the same publishable/anon key from the Supabase dashboard.
      publishableKey: QConfig.supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(authFlowType: AuthFlowType.pkce),
    );
  } catch (e, st) {
    debugPrint('[bootstrap] Supabase.initialize failed: $e\n$st');
  }
  runApp(const ProviderScope(child: QuorilApp()));
}

class QuorilApp extends ConsumerWidget {
  const QuorilApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // The Appearance setting can force light/dark; otherwise follow the OS.
    final forced = ref.watch(themeModeProvider).forcedBrightness;
    final brightness = forced ??
        (MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light);
    return CupertinoApp(
      title: 'Quoril',
      debugShowCheckedModeBanner: false,
      theme: brightness == Brightness.dark ? QTheme.dark : QTheme.light,
      // When a mode is forced, override platformBrightness for the whole tree so
      // screens that read it directly (the ember/page gradients) also flip.
      builder: (context, child) {
        if (forced == null) return child ?? const SizedBox.shrink();
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(platformBrightness: forced),
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: const AuthGate(),
    );
  }
}

/// Decides the first screen: signed-in → app shell; otherwise onboarding/auth.
/// Uses live auth state so sign-in / sign-out navigate automatically.
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(signedInProvider);
    if (signedIn) return const AppShell();
    return const OnboardingScreen();
  }
}

/// Fallback entry to the auth screen (used after onboarding completes).
class AuthEntry extends StatelessWidget {
  const AuthEntry({super.key});
  @override
  Widget build(BuildContext context) => const SignInScreen();
}
