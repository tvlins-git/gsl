module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo wires the Reanimated/Worklets plugin when those
    // packages are installed — do not add `react-native-reanimated/plugin` again.
    presets: ['babel-preset-expo'],
  };
};
