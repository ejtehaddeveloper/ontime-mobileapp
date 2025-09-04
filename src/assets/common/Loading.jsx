import React from 'react';
import {View, StyleSheet, Dimensions, Loader} from 'react-native';
import {Colors} from '../constants';

const Loading = () => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <Loader visible={true} color={Colors.primary} size="large" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // optional: dim effect
    zIndex: 9999, // keep it above other components
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Loading;
