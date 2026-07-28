import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/config.dart';
import 'core/data/providers.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/sign_in_screen.dart';
import 'features/onboarding/onboarding_screen.dart';
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
      anonKey: QConfig.supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(authFlowType: AuthFlowType.pkce),
    );
  } catch (e, st) {
    debugPrint('[bootstrap] Supabase.initialize failed: $e\n$st');
  }
  runApp(const ProviderScope(child: QuorilApp()));
}

class QuorilApp extends StatelessWidget {
  const QuorilApp({super.key});

  @override
  Widget build(BuildContext context) {
    final brightness = MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;
    return CupertinoApp(
      title: 'Quoril',
      debugShowCheckedModeBanner: false,
      theme: brightness == Brightness.dark ? QTheme.dark : QTheme.light,
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
