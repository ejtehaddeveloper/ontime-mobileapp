/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {Colors} from '../../assets/constants';
import {CommonActions, useNavigation} from '@react-navigation/native';
import {t} from 'i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import i18n from '../../assets/locales/i18';

const LoginOrSignup = () => {
  const logo = require('../../assets/images/logo2.png');

  const navigation = useNavigation();
  const handleLogin = () => {
    navigation.navigate('Login');
  };
  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  const handleGoback = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'App'}],
      }),
    );
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
    <View style={styles.contaner}>
      <View
        style={{
          alignItems: 'center',
          marginTop: 15,
          width: 210,
          // paddingLeft: 25,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignSelf: 'flex-start',
        }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name={i18n.language === 'en' ? 'arrow-back' : 'arrow-forward'}
            size={25}
            // color={Colors.primary}
            onPress={handleGoback}
            hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
          />
        </TouchableOpacity>
      </View>
      <ScrollView>
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 50,
          }}>
          <Image source={logo} style={styles.image} />
        </View>
        <TouchableOpacity style={styles.cont} onPress={handleLogin}>
          <Text style={styles.continueText}>{t('Login')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cont2} onPress={handleSignup}>
          <Text style={styles.continueText2}>{t('Sign up')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View></SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contaner: {
    backgroundColor: '#fff',
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 12,
    fontWeight: '400',
  },
  title2: {
    fontSize: 72,
    marginTop: -35,
    color: Colors.primary,
    fontFamily: 'Allura-Regular',
  },
  cont: {
    width: 335,
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cont2: {
    width: 335,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 25,
  },
  continueText: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'VladimirScript',
  },
  continueText2: {
    color: '#000',
    fontWeight: '600',
    fontFamily: 'VladimirScript',
  },
  image: {
    width: 150,
    height: 250,
  },
});

export default LoginOrSignup;
