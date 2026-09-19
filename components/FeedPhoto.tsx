import { useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { theme } from '@/constants/theme';
import {
  FEED_PHOTO_FALLBACK_ASPECT,
  FEED_PHOTO_MAX_HEIGHT,
  feedPhotoAspect,
  feedPhotoDisplayHeight,
  readLoadedImageSize,
} from '@/lib/feed-photo';

interface FeedPhotoProps {
  uri: string;
  testID?: string;
  maxHeight?: number;
  style?: StyleProp<ImageStyle>;
}

export function FeedPhoto({
  uri,
  testID,
  maxHeight = FEED_PHOTO_MAX_HEIGHT,
  style,
}: FeedPhotoProps) {
  const [aspect, setAspect] = useState(FEED_PHOTO_FALLBACK_ASPECT);
  const [boxWidth, setBoxWidth] = useState(0);

  const measured = boxWidth > 0;
  const height = measured ? feedPhotoDisplayHeight(boxWidth, aspect, maxHeight) : undefined;

  return (
    <View
      style={styles.frame}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth > 0) setBoxWidth(nextWidth);
      }}
    >
      <Image
        source={{ uri }}
        style={[
          styles.image,
          measured ? { height } : { aspectRatio: aspect, maxHeight },
          style,
        ]}
        resizeMode="contain"
        onLoad={(event) => {
          const size = readLoadedImageSize(event.nativeEvent) ?? readLoadedImageSize(event);
          if (size) setAspect(feedPhotoAspect(size.width, size.height));
        }}
        testID={testID}
        accessibilityRole="image"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    backgroundColor: theme.colors.borderLight,
  },
  image: {
    width: '100%',
    backgroundColor: theme.colors.borderLight,
  },
});
