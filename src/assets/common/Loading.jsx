import React from 'react';
import {View, StyleSheet, Dimensions, ActivityIndicator} from 'react-native';
import {Colors} from '../constants';

const Loading = () => (
  <View style={styles.wrapper} pointerEvents="none">
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Loading;
