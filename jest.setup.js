jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'datetime-picker' }),
  };
});

jest.mock('expo-font');
jest.mock('expo-asset');
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: null, expoConfig: { extra: {} } },
  expoConfig: { extra: {} },
}));

const mockSwipeable = () => {
  const React = require('react');
  const { View } = require('react-native');
  const Swipeable = React.forwardRef(
    ({ children, renderRightActions, ...props }, _ref) =>
      React.createElement(
        View,
        props,
        children,
        typeof renderRightActions === 'function'
          ? renderRightActions(1, 1, { close: jest.fn() })
          : null
      )
  );
  Swipeable.displayName = 'Swipeable';
  return Swipeable;
};

jest.mock('react-native-gesture-handler', () => {
  const Swipeable = mockSwipeable();
  return {
    Swipeable,
    GestureHandlerRootView: ({ children }) => children,
  };
});

jest.mock('react-native-gesture-handler/Swipeable', () => ({
  __esModule: true,
  default: mockSwipeable(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: { from: jest.fn(() => ({ upload: jest.fn(), remove: jest.fn(), getPublicUrl: jest.fn(() => ({ data: { publicUrl: '' } })) })) },
    functions: { invoke: jest.fn() },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    removeChannel: jest.fn(),
  },
  isSupabaseConfigured: jest.fn(() => false),
}));
