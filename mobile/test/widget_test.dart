import 'package:flutter/cupertino.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:quoril_mobile/core/config.dart';
import 'package:quoril_mobile/main.dart';

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: QConfig.supabaseUrl,
      anonKey: QConfig.supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(authFlowType: AuthFlowType.pkce),
    );
  });

  testWidgets('App boots into onboarding when signed out', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: QuorilApp()));
    await tester.pump();
    expect(find.byType(CupertinoApp), findsOneWidget);
  });
}
