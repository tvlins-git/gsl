import { listAppUsers } from '@/lib/app-users';
import { syncLoginAccountsIntoGroup } from '@/lib/group-member-sync';
import { isLocalMode } from '@/lib/local-store';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getEffectivePassword } from '@/lib/user-passwords';

jest.mock('@/lib/app-users', () => ({
  listAppUsers: jest.fn(),
}));

jest.mock('@/lib/local-store', () => ({
  isLocalMode: jest.fn(() => false),
}));

jest.mock('@/lib/user-passwords', () => ({
  getEffectivePassword: jest.fn(async () => 'secret'),
}));

function membersQuery(names: string[]) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(async () => ({
      data: names.map((display_name) => ({ display_name })),
      error: null,
    })),
  };
  return query;
}

describe('syncLoginAccountsIntoGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isLocalMode as jest.Mock).mockReturnValue(false);
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    (getEffectivePassword as jest.Mock).mockResolvedValue('secret');
    (listAppUsers as jest.Mock).mockResolvedValue([
      {
        id: 'hr-lins',
        email: 'hr.lins@gsl.local',
        displayName: 'Hr. Lins',
        password: 'thomas',
        role: 'admin',
      },
      {
        id: 'test',
        email: 'test@gsl.local',
        displayName: 'Test',
        password: 'secret',
        role: 'member',
      },
    ]);
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: { user_id: 'new' }, error: null });
    (supabase.from as jest.Mock).mockReturnValue(membersQuery(['Hr. Lins']));
  });

  it('adds login accounts that are not already in the group', async () => {
    await expect(syncLoginAccountsIntoGroup('group-1')).resolves.toEqual([]);
    expect(getEffectivePassword).toHaveBeenCalled();
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('create-group-member', {
      body: {
        email: 'test@gsl.local',
        password: 'secret',
        display_name: 'Test',
      },
    });
  });

  it('pads short passwords so Auth will create the member', async () => {
    (getEffectivePassword as jest.Mock).mockResolvedValue('test');
    await syncLoginAccountsIntoGroup('group-1');
    expect(supabase.functions.invoke).toHaveBeenCalledWith('create-group-member', {
      body: {
        email: 'test@gsl.local',
        password: 'testgs',
        display_name: 'Test',
      },
    });
  });

  it('skips accounts already in the group', async () => {
    (supabase.from as jest.Mock).mockReturnValue(membersQuery(['Hr. Lins', 'Test']));
    await syncLoginAccountsIntoGroup('group-1');
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('does nothing in local mode', async () => {
    (isLocalMode as jest.Mock).mockReturnValue(true);
    await syncLoginAccountsIntoGroup('group-1');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
