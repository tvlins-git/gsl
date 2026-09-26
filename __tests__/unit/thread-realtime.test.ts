import { supabase } from '@/lib/supabase';
import { resetThreadRealtimeForTests, subscribeToThreadInserts } from '@/lib/thread-realtime';
import type { Message } from '@/lib/database.types';

const REFUSED = 'cannot add `postgres_changes` callbacks for realtime:thread-thread-1 after `subscribe()`.';

type FakeChannel = {
  topic: string;
  state: string;
  on: jest.Mock;
  subscribe: jest.Mock;
  deliver: (message: Message) => void;
};

function installChannelClient() {
  const channels = new Map<string, FakeChannel>();
  (supabase.channel as jest.Mock).mockClear();

  (supabase.channel as jest.Mock).mockImplementation((topic: string) => {
    const existing = channels.get(topic);
    if (existing) return existing;

    const channel: FakeChannel = {
      topic,
      state: 'closed',
      deliver: () => undefined,
      on: jest.fn((type: string, _filter: unknown, callback: (payload: { new: Message }) => void) => {
        if (channel.state === 'joining' || channel.state === 'joined' || channel.state === 'leaving') {
          throw new Error(
            `cannot add \`${type}\` callbacks for realtime:${topic} after \`subscribe()\`.`
          );
        }
        channel.deliver = (message) => callback({ new: message });
        return channel;
      }),
      subscribe: jest.fn(() => {
        channel.state = 'joining';
        return channel;
      }),
    };
    channels.set(topic, channel);
    return channel;
  });

  (supabase.removeChannel as jest.Mock).mockImplementation((channel: FakeChannel) => {
    channels.delete(channel.topic);
    channel.state = 'closed';
    return Promise.resolve('ok');
  });

  return { channels };
}

const message = {
  id: 'msg-1',
  thread_id: 'thread-1',
  sender_id: 'user-2',
  body: 'hello',
  created_at: '2026-07-13T12:00:00Z',
} as Message;

describe('subscribeToThreadInserts', () => {
  beforeEach(() => {
    resetThreadRealtimeForTests();
    installChannelClient();
  });

  it('shares one channel so a second Open chat does not subscribe twice', () => {
    const first: Message[] = [];
    const second: Message[] = [];
    const stopFirst = subscribeToThreadInserts('thread-1', (row) => first.push(row));
    expect(() => subscribeToThreadInserts('thread-1', (row) => second.push(row))).not.toThrow();

    expect(supabase.channel).toHaveBeenCalledTimes(1);
    const topic = (supabase.channel as jest.Mock).mock.calls[0][0] as string;
    expect(topic.startsWith('thread-thread-1-')).toBe(true);

    const channel = (supabase.channel as jest.Mock).mock.results[0].value as FakeChannel;
    expect(channel.on).toHaveBeenCalledTimes(1);
    channel.deliver(message);
    expect(first).toEqual([message]);
    expect(second).toEqual([message]);

    stopFirst();
    expect(supabase.removeChannel).not.toHaveBeenCalled();
  });

  it('does not call postgres_changes on a channel that is already subscribed', () => {
    const live = {
      state: 'joining',
      on: jest.fn(() => {
        throw new Error(REFUSED);
      }),
      subscribe: jest.fn(),
    };
    (supabase.channel as jest.Mock).mockImplementation(() => live);

    expect(() => subscribeToThreadInserts('thread-1', () => undefined)).not.toThrow();
    expect(live.on).not.toHaveBeenCalled();
    expect(live.subscribe).not.toHaveBeenCalled();
  });

  it('still opens when realtime refuses the listener', () => {
    (supabase.channel as jest.Mock).mockImplementation(() => ({
      state: 'closed',
      on: () => {
        throw new Error(REFUSED);
      },
      subscribe: jest.fn(),
    }));

    expect(() => subscribeToThreadInserts('thread-1', () => undefined)).not.toThrow();
  });

  it('can subscribe again after the previous listener has released the channel', () => {
    const stop = subscribeToThreadInserts('thread-1', () => undefined);
    stop();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);

    expect(() => subscribeToThreadInserts('thread-1', () => undefined)).not.toThrow();
    expect(supabase.channel).toHaveBeenCalledTimes(2);
    const topics = (supabase.channel as jest.Mock).mock.calls.map((call) => call[0] as string);
    expect(new Set(topics).size).toBe(2);
  });

  it('swallows a removeChannel failure so unmount does not throw', () => {
    (supabase.removeChannel as jest.Mock).mockImplementation(() => {
      throw new Error(REFUSED);
    });

    const stop = subscribeToThreadInserts('thread-1', () => undefined);
    expect(() => stop()).not.toThrow();
  });
});
