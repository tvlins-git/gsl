import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStore } from '@/lib/local-store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const GROUP_ID = 'group-1';
const USER_ID = 'user-1';

describe('localStore.deletePoll', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('deletes the linked chat thread and its messages', async () => {
    const poll = await localStore.createPoll(GROUP_ID, 'Dinner', USER_ID, [
      { startsAt: '2026-10-01T17:00:00.000Z', endsAt: '2026-10-01T19:00:00.000Z' },
    ]);
    const slots = await localStore.getPollSlots(poll.id);
    await localStore.upsertPollResponse(slots[0].id, 'member-1', 'yes');

    const linked = await localStore.createThread(GROUP_ID, 'Dinner', USER_ID, poll.id);
    await localStore.addMessage(linked.id, USER_ID, 'Still waiting on Ada.');
    const other = await localStore.createThread(GROUP_ID, 'Weekend plans', USER_ID);

    await localStore.deletePoll(poll.id);

    expect(await localStore.getPoll(poll.id)).toBeNull();
    expect(await localStore.getPollSlots(poll.id)).toEqual([]);
    expect(await localStore.getPollResponses([slots[0].id])).toEqual([]);
    expect(await localStore.getThread(linked.id)).toBeNull();
    expect(await localStore.getMessages(linked.id)).toEqual([]);
    expect(await localStore.findThreadByPoll(poll.id)).toBeNull();

    const remaining = await localStore.getThreads(GROUP_ID);
    expect(remaining.map((thread) => thread.id)).toEqual([other.id]);
    expect(remaining[0].poll_id).toBeNull();
  });

  it('deletes every thread linked to the poll', async () => {
    const poll = await localStore.createPoll(GROUP_ID, 'Brunch', USER_ID, []);
    const first = await localStore.createThread(GROUP_ID, 'Brunch', USER_ID, poll.id);
    const second = await localStore.createThread(GROUP_ID, 'Brunch again', USER_ID, poll.id);
    await localStore.addMessage(first.id, USER_ID, 'One');
    await localStore.addMessage(second.id, USER_ID, 'Two');

    await localStore.deletePoll(poll.id);

    expect(await localStore.getThread(first.id)).toBeNull();
    expect(await localStore.getThread(second.id)).toBeNull();
    expect(await localStore.getMessages(first.id)).toEqual([]);
    expect(await localStore.getMessages(second.id)).toEqual([]);
  });
});
