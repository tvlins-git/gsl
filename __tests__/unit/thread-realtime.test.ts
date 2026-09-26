import { supabase } from '@/lib/supabase';
import { subscribeToThreadInserts } from '@/lib/thread-realtime';

describe('subscribeToThreadInserts', () => {
  const channels = new Map<string, { subscribed: boolean }>();

  beforeEach(() => {
    channels.clear();
    (supabase.channel as jest.Mock).mockImplementation((topic: string) => {
      const existing = channels.get(topic);
      if (existing?.subscribed) {
        return {
          on: () => {
            throw new Error(
              `cannot add \`postgres_changes\` callbacks for realtime:${topic} after \`subscribe()\`.`
            );
          },
          subscribe: jest.fn(),
        };
      }

      const state = { subscribed: false };
      const channel = {
        on: jest.fn(() => channel),
        subscribe: jest.fn(() => {
          state.subscribed = true;
          channels.set(topic, state);
          return channel;
        }),
      };
      channels.set(topic, state);
      return channel;
    });
    (supabase.removeChannel as jest.Mock).mockReset();
  });

  it('gives every listener its own channel so a second Open chat does not crash', () => {
    const stopFirst = subscribeToThreadInserts('thread-1', () => undefined);
    expect(() => subscribeToThreadInserts('thread-1', () => undefined)).not.toThrow();

    const topics = (supabase.channel as jest.Mock).mock.calls.map((call) => call[0] as string);
    expect(topics).toHaveLength(2);
    expect(new Set(topics).size).toBe(2);
    expect(topics.every((topic) => topic.startsWith('thread-thread-1-'))).toBe(true);

    stopFirst();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
  });

  it('still opens the thread when realtime refuses the listener', () => {
    (supabase.channel as jest.Mock).mockImplementation(() => ({
      on: () => {
        throw new Error(
          'cannot add `postgres_changes` callbacks for realtime:thread-thread-1 after `subscribe()`.'
        );
      },
      subscribe: jest.fn(),
    }));

    expect(() => subscribeToThreadInserts('thread-1', () => undefined)).not.toThrow();
  });
});
