import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { AppButton } from '../common/AppButton';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  iconName?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  iconName = 'help-circle-outline',
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
        <View
          style={[
            styles.content,
            {
              backgroundColor: theme.colors.card,
              borderRadius: theme.borderRadius.xl,
              ...theme.shadows.lg,
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor:
                  confirmVariant === 'danger' ? theme.colors.errorLight : theme.colors.primaryLight,
              },
            ]}
          >
            <Ionicons
              name={iconName}
              size={32}
              color={confirmVariant === 'danger' ? theme.colors.error : theme.colors.primary}
            />
          </View>

          <Text
            style={[
              styles.title,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.size.lg,
                fontWeight: theme.typography.weight.bold,
              },
            ]}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.message,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.size.sm,
              },
            ]}
          >
            {message}
          </Text>

          <View style={styles.buttonRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <AppButton
                title={cancelText}
                onPress={onCancel}
                variant="outline"
                size="md"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <AppButton
                title={confirmText}
                onPress={onConfirm}
                variant={confirmVariant}
                size="md"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 340,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
  },
});
