/* eslint-disable react-native/no-inline-styles */
import {View, Text} from 'react-native';
import {Modal, Pressable, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {t} from 'i18next';
import React from 'react';
import styles from './proStyles';
const ConfirmModal = ({
  visible,
  title,
  iconName,
  onCancel,
  onConfirm,
  cancelText = t('Cancel'),
  confirmText = t('Confirm'),
  confirmColor = Colors.primary,
  iconColor,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="none"
    onRequestClose={onCancel}>
    <View style={styles.simpleModalBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <View style={styles.simpleModalCard}>
        <View style={{alignItems: 'center', marginBottom: 8}}>
          <Ionicons
            name={iconName}
            size={26}
            color={iconColor ?? Colors.primary}
          />
        </View>
        <Text style={styles.modalTitle}>{title}</Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 14,
          }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.simpleCancelBtn}
            onPress={onCancel}>
            <Text style={styles.simpleCancelText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.simpleConfirmBtn, {backgroundColor: confirmColor}]}
            onPress={onConfirm}>
            <Text style={styles.simpleConfirmText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default ConfirmModal;
