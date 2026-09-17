// Marketplace catalogue constants. The platform list can be overridden by the
// admin via the AdminSetting key `marketplace_platforms` (comma-separated).
export const DEFAULT_PLATFORMS = [
  'Facebook', 'TikTok', 'Instagram', 'X / Twitter', 'YouTube', 'Telegram',
  'LinkedIn', 'Pinterest', 'Reddit', 'Discord', 'Other'
];

export const ACCOUNT_KINDS = ['Page', 'Account', 'Channel', 'Profile'];

export function followersLabel(accountKind) {
  return accountKind === 'Channel' ? 'Subscribers' : 'Followers';
}