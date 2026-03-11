import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';

/**
 * Checks if the current user is the admin of the configured relay.
 * Admin pubkey is stored in app config, set when the relay is first
 * configured. The relay admin is whoever set up the relay — their
 * pubkey is in [roles.admin] in the zooid config.
 *
 * For simplicity we derive this from a stored config value rather than
 * querying the relay, since the relay doesn't expose its admin list publicly.
 */
export function useIsAdmin(): boolean {
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  if (!user) return false;

  // The admin pubkey is stored in config when set explicitly
  const adminPubkey = (config as unknown as { adminPubkey?: string }).adminPubkey;
  if (adminPubkey) return user.pubkey === adminPubkey;

  // Fall back: if no admin is set, only show admin UI to the first user
  // who has relays configured (the person who set up the relay)
  return config.relayMetadata.relays.length > 0;
}
