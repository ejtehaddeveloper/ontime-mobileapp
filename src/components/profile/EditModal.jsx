/* eslint-disable react-native/no-inline-styles */
import {View, Text, Alert, TextInput, TouchableOpacity} from 'react-native';
import React, {useEffect, useState, useCallback} from 'react';
import {t} from 'i18next';
import ModalWrapperNoAnimation from './ModalWrapper';
import {Colors} from '../../assets/constants';
import styles from './proStyles';

const EditModal = ({visible, onClose, initialValue, onConfirm}) => {
  const [localName, setLocalName] = useState(initialValue ?? '');

  // When modal opens with different initial value, sync once
  useEffect(() => {
    if (visible) {
      setLocalName(initialValue ?? '');
    }
  }, [visible, initialValue]);

  const submit = useCallback(async () => {
    if (!localName || localName.trim().length === 0) {
      Alert.alert(t('Error'), t('Name cannot be empty'));
      return;
    }
    const ok = await onConfirm(localName.trim());
    if (ok) {
      onClose && onClose();
    } else {
      // keep modal open for retry
    }
  }, [localName, onConfirm, onClose]);

  return (
    <ModalWrapperNoAnimation
      visible={visible}
      onRequestClose={onClose}
      backdropPressCloses={false}
      testID="edit-modal">
      <Text style={styles.modalTitle}>{t('Edit your name')}</Text>
      <TextInput
        placeholder={t('Enter your name')}
        value={localName}
        onChangeText={setLocalName}
        style={styles.input}
        placeholderTextColor={Colors.black3}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 14,
        }}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.simpleCancelBtn}
          onPress={onClose}>
          <Text style={styles.simpleCancelText}>{t('Cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.simpleConfirmBtn, {backgroundColor: Colors.primary}]}
          onPress={submit}>
          <Text style={styles.simpleConfirmText}>{t('Confirm')}</Text>
        </TouchableOpacity>
      </View>
    </ModalWrapperNoAnimation>
  );
};

export default EditModal;
