/// App-wide configuration. Supabase creds match the existing Quoril backend
/// (anon/publishable key — safe to ship in the client; RLS enforces access).
class QConfig {
  QConfig._();

  static const supabaseUrl = 'https://izxoyfydqsopvaywrtuz.supabase.co';
  static const supabaseAnonKey = 'sb_publishable_XTpgjyAzkWJJ5RwysjRZlg_4jjsZV4Q';

  /// Deep-link scheme registered for OAuth callbacks (matches desktop).
  static const authCallback = 'quoril://auth/callback';
  static const scheme = 'quoril';
}
