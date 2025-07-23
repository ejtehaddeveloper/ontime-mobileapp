/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors} from '../../assets/constants';

const CustomSwitch = ({isEnabled, onToggle}) => {
  return (
    <TouchableOpacity style={styles.switchContainer} onPress={onToggle}>
      {/* <Text style={styles.switchText}>{isEnabled ? 'ON' : 'OFF'}</Text> */}
      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: isEnabled ? Colors.primary : '#fff',
            borderWidth: isEnabled ? 0 : 1,
            borderColor: Colors.primary,
          },
        ]}>
        <View
          style={[
            styles.switchThumb,
            {
              alignSelf: isEnabled ? 'flex-end' : 'flex-start',
              backgroundColor: isEnabled ? '#fff' : '#ccc',
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  switchText: {
    fontSize: 16,
    color: '#000',
  },
  switchTrack: {
    width: 50,
    height: 25,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
});

export default CustomSwitch;
