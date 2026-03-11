import { NRelay1 } from '@nostrify/nostrify';
import type { NUser } from '@nostrify/react/login';

/**
 * Sends a kind 28934 RELAY_JOIN event directly to a relay using a fresh
 * NRelay1 connection — bypassing the app's NPool entirely.
 *
 * This is necessary during onboarding because the pool was initialized
 * before the relay config was saved, so it can't be trusted to have
 * a live authenticated connection yet.
 */
export async function sendJoinRequest(
  relayUrl: string,
  claim: string,
  user: NUser,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let authDone = false;
    let resolved = false;

    const done = (err?: Error) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(giveUpTimer);
      if (err) reject(err);
      else resolve();
    };

    // Give up after 15 seconds total
    const giveUpTimer = setTimeout(() => {
      done(new Error('Join request timed out'));
    }, 15000);

    const relay = new NRelay1(relayUrl, {
      auth: async (challenge: string) => {
        console.log('[sendJoinRequest] AUTH challenge, signing...');

        const authEvent = await user.signer.signEvent({
          kind: 22242,
          content: '',
          tags: [
            ['relay', relayUrl],
            ['challenge', challenge],
          ],
          created_at: Math.floor(Date.now() / 1000),
        });

        console.log('[sendJoinRequest] AUTH signed, sending join request...');
        authDone = true;

        // Give relay 800ms to process auth before publishing
        setTimeout(async () => {
          try {
            const joinEvent = await user.signer.signEvent({
              kind: 28934,
              content: '',
              tags: [['claim', claim]],
              created_at: Math.floor(Date.now() / 1000),
            });

            await relay.event(joinEvent, { signal: AbortSignal.timeout(5000) });
            console.log('[sendJoinRequest] Join event accepted by relay');
            done();
          } catch (err) {
            console.warn('[sendJoinRequest] Join event rejected:', err);
            // Resolve anyway — the relay might still process the claim
            done();
          }
        }, 800);

        return authEvent;
      },
    });

    // Fallback: if no AUTH challenge comes within 5s, try publishing anyway
    setTimeout(async () => {
      if (authDone || resolved) return;
      console.log('[sendJoinRequest] No AUTH challenge — trying direct publish');
      try {
        const joinEvent = await user.signer.signEvent({
          kind: 28934,
          content: '',
          tags: [['claim', claim]],
          created_at: Math.floor(Date.now() / 1000),
        });
        await relay.event(joinEvent, { signal: AbortSignal.timeout(5000) });
        done();
      } catch {
        done(); // resolve anyway, don't block onboarding
      }
    }, 5000);
  });
}
