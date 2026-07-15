import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { sharedStyles, theme } from '@/constants/theme';
import type { Member } from '@/lib/database.types';

interface MemberSelectProps {
  members: Member[];
  value: string | null;
  onChange: (memberId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  testID?: string;
  width?: number;
}

export function MemberSelect({
  members,
  value,
  onChange,
  disabled = false,
  placeholder = 'Unassigned',
  testID,
  width = 168,
}: MemberSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedMember = members.find((m) => m.id === value);
  const label = selectedMember?.display_name ?? placeholder;
  const isPlaceholder = !selectedMember;

  const select = (memberId: string | null) => {
    onChange(memberId);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        style={({ pressed }) => [
          styles.trigger,
          { width },
          pressed && !disabled && styles.triggerPressed,
          disabled && styles.triggerDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Host: ${label}`}
        accessibilityState={{ disabled, expanded: open }}
        testID={testID}
      >
        <Text
          style={[styles.triggerText, isPlaceholder && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <SymbolView
          name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' }}
          tintColor={theme.colors.textMuted}
          size={18}
        />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={sharedStyles.modalOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Assign host</Text>
            <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
              <Pressable
                style={[styles.option, value === null && styles.optionSelected]}
                onPress={() => select(null)}
                testID={testID ? `${testID}-option-unassigned` : undefined}
              >
                <Text style={[styles.optionText, value === null && styles.optionTextSelected]}>
                  {placeholder}
                </Text>
                {value === null ? (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    tintColor={theme.colors.accent}
                    size={16}
                  />
                ) : null}
              </Pressable>
              {members.map((member) => {
                const selected = value === member.id;
                return (
                  <Pressable
                    key={member.id}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => select(member.id)}
                    testID={testID ? `${testID}-option-${member.id}` : undefined}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {member.display_name}
                    </Text>
                    {selected ? (
                      <SymbolView
                        name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                        tintColor={theme.colors.accent}
                        size={16}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.cancelBtn} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
  },
  triggerPressed: {
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.textMuted,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  triggerPlaceholder: {
    color: theme.colors.textMuted,
    fontWeight: '400',
  },
  sheet: {
    marginHorizontal: theme.spacing.lg,
    marginTop: 'auto',
    marginBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  options: {
    maxHeight: 320,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  optionSelected: {
    backgroundColor: theme.colors.accentSoft,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: theme.colors.accent,
  },
  cancelBtn: {
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});
