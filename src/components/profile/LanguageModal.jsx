/* eslint-disable react-native/no-inline-styles */
import {View, Text, TouchableOpacity} from 'react-native';
import React, {useState, memo, useEffect, useCallback} from 'react';
import ModalWrapperNoAnimation from './ModalWrapper';
import {Colors} from '../../assets/constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {t} from 'i18next';
import styles from './proStyles';

const LanguageModal = memo(
  ({visible, onClose, initialLang = 'en', onConfirmLanguage}) => {
    const [localTemp, setLocalTemp] = useState(initialLang);

    useEffect(() => {
      if (visible) {
        setLocalTemp(initialLang);
      }
    }, [visible, initialLang]);

    const selectLocal = useCallback(lang => setLocalTemp(lang), []);

    const confirm = useCallback(async () => {
      if (onConfirmLanguage) {
        await onConfirmLanguage(localTemp);
      }
      onClose && onClose();
    }, [localTemp, onConfirmLanguage, onClose]);

    return (
      <ModalWrapperNoAnimation
        visible={visible}
        onRequestClose={onClose}
        backdropPressCloses={false}
        testID="language-modal">
        <Text style={styles.modalTitle}>{t('Choose a Language')}</Text>

        <View style={{marginTop: 12}}>
          <TouchableOpacity
            activeOpacity={0.78}
            style={[
              styles.simpleOption,
              localTemp === 'ar' && styles.simpleOptionSelected,
            ]}
            onPress={() => selectLocal('ar')}>
            <Text
              style={[
                styles.simpleOptionText,
                localTemp === 'ar' && {color: Colors.primary},
              ]}>
              عربي
            </Text>

            <View style={styles.flagWrapper}>
              {localTemp === 'ar' && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.78}
            style={[
              styles.simpleOption,
              localTemp === 'en' && styles.simpleOptionSelected,
            ]}
            onPress={() => selectLocal('en')}>
            <Text
              style={[
                styles.simpleOptionText,
                localTemp === 'en' && {color: Colors.primary},
              ]}>
              English
            </Text>

            <View style={styles.flagWrapper}>
              {localTemp === 'en' && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </View>
          </TouchableOpacity>

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
              style={[
                styles.simpleConfirmBtn,
                {backgroundColor: localTemp ? Colors.primary : '#ccc'},
              ]}
              onPress={confirm}
              disabled={!localTemp}>
              <Text style={styles.simpleConfirmText}>{t('Change')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ModalWrapperNoAnimation>
    );
  },
);

export default LanguageModal;
