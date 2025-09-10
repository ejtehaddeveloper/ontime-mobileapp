import {View, Modal, Pressable, StyleSheet} from 'react-native';
import React from 'react';
import styles from './proStyles';

const ModalWrapperNoAnimation = ({
  visible,
  onRequestClose,
  children,
  backdropPressCloses = true,
  testID,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onRequestClose}
      testID={testID}>
      <View style={styles.simpleModalBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() =>
            backdropPressCloses && onRequestClose && onRequestClose()
          }
        />
        <View style={styles.simpleModalCard}>{children}</View>
      </View>
    </Modal>
  );
};
export default ModalWrapperNoAnimation;
