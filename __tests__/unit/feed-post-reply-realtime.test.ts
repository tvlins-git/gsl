import { supabase } from '@/lib/supabase';
import {
  resetFeedPostReplyRealtimeForTests,
  subscribeToFeedPostReplyInserts,
} from '@/lib/feed-post-reply-realtime';
import type { FeedPostReply } from '@/lib/database.types';

const REFUSED =
  'cannot add `postgres_changes` callbacks for realtime:feed-post-replies-post-1 after `subscribe()`.';

type FakeChannel = {
  topic: string;
  state: string;
  on: jest.Mock;
  subscribe: jest.Mock;
  deliver: (reply: FeedPostReply) => void;
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
      on: jest.fn((type: string, _filter: unknown, callback: (payload: { new: FeedPostReply }) => void) => {
        if (channel.state === 'joining' || channel.state === 'joined' || channel.state === 'leaving') {
          throw new Error(
            `cannot add \`${type}\` callbacks for realtime:${topic} after \`subscribe()\`.`
          );
        }
        channel.deliver = (reply) => callback({ new: reply });
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

const reply = {
  id: 'reply-1',
  post_id: 'post-1',
  author_id: 'user-2',
  body: 'hello',
  created_at: '2026-09-27T12:00:00Z',
} as FeedPostReply;

describe('subscribeToFeedPostReplyInserts', () => {
  beforeEach(() => {
    resetFeedPostReplyRealtimeForTests();
    installChannelClient();
  });

  it('shares one channel so inline + full thread do not subscribe twice', () => {
    const first: FeedPostReply[] = [];
    const second: FeedPostReply[] = [];
    const stopFirst = subscribeToFeedPostReplyInserts('post-1', (row) => first.push(row));
    expect(() => subscribeToFeedPostReplyInserts('post-1', (row) => second.push(row))).not.toThrow();

    expect(supabase.channel).toHaveBeenCalledTimes(1);
    const topic = (supabase.channel as jest.Mock).mock.calls[0][0] as string;
    expect(topic.startsWith('feed-post-replies-post-1-')).toBe(true);

    const channel = (supabase.channel as jest.Mock).mock.results[0].value as FakeChannel;
    expect(channel.on).toHaveBeenCalledTimes(1);
    channel.deliver(reply);
    expect(first).toEqual([reply]);
    expect(second).toEqual([reply]);

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

    expect(() => subscribeToFeedPostReplyInserts('post-1', () => undefined)).not.toThrow();
    expect(live.on).not.toHaveBeenCalled();
    expect(live.subscribe).not.toHaveBeenCalled();
  });

  it('can subscribe again after the previous listener has released the channel', () => {
    const stop = subscribeToFeedPostReplyInserts('post-1', () => undefined);
    stop();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);

    expect(() => subscribeToFeedPostReplyInserts('post-1', () => undefined)).not.toThrow();
    expect(supabase.channel).toHaveBeenCalledTimes(2);
  });
});
