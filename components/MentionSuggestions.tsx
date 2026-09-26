import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { FeedMentionSuggestion } from '@/lib/feed-posts';

interface MentionSuggestionsProps {
  suggestions: FeedMentionSuggestion[];
  onSelect: (insert: string) => void;
  testIDPrefix: string;
}

export function MentionSuggestions({ suggestions, onSelect, testIDPrefix }: MentionSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.suggestions} testID={`${testIDPrefix}-mention-suggestions`}>
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion.id}
          style={styles.suggestion}
          onPress={() => onSelect(suggestion.insert)}
          testID={
            suggestion.id === 'everyone'
              ? `${testIDPrefix}-mention-everyone`
              : `${testIDPrefix}-mention-member-${suggestion.id}`
          }
          accessibilityRole="button"
          accessibilityLabel={`Mention ${suggestion.label}`}
        >
          <Text style={styles.suggestionText}>@{suggestion.insert}</Text>
          <Text style={styles.suggestionMeta}>
            {suggestion.id === 'everyone' ? 'Notify the whole group' : suggestion.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  suggestions: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg,
    overflow: 'hidden',
  },
  suggestion: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    gap: 2,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  suggestionMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
