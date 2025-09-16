/* eslint-disable react-native/no-inline-styles */

import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {AuthProvider} from './src/context/AuthContext';
import {NetworkProvider} from './src/assets/common/NetworkStatus';
import i18n, {i18n as i18ne} from './src/assets/locales/i18';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {I18nextProvider} from 'react-i18next';
import NotificationHandler from './src/assets/common/NotificationHandler';
import {I18nManager, StatusBar, View, Text} from 'react-native';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import {useNetwork} from './src/assets/common/NetworkStatus';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {Colors} from './src/assets/constants';
import Orientation from 'react-native-orientation-locker';
import {t} from 'i18next';

import Splash from './src/Screens/Splash';
import Splash2 from './src/Screens/Splash2';
import Auth from './src/navigation/Auth';
import AppN from './src/navigation/AppN';

const Stack = createStackNavigator();

const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="Splash2" component={Splash2} />
      <Stack.Screen name="Auth" component={Auth} />
      <Stack.Screen name="App" component={AppN} />
    </Stack.Navigator>
  );
};

const NoInternetScreen = () => (
  <View
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
    }}>
    <MaterialIcons name="wifi-off" color={Colors.primary} size={70} />
    <Text style={{fontSize: 18, fontWeight: 'bold', color: Colors.primary}}>
      {t('No internet connection')}
    </Text>
  </View>
);

const AppContent = () => {
  const isConnected = useNetwork();

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <NotificationHandler />
      {isConnected ? <MainNavigator /> : <NoInternetScreen />}
    </NavigationContainer>
  );
};

const App = () => {
  useEffect(() => {
    Orientation.lockToPortrait();
  }, []);

  useEffect(() => {
    const fetchLanguage = async () => {
      const storedLang = await AsyncStorage.getItem('language');
      if (storedLang) {
        i18n.changeLanguage(storedLang);
        if (storedLang === 'ar') {
          I18nManager.forceRTL(true);
        } else {
          I18nManager.forceRTL(false);
        }
      }
    };
    fetchLanguage();
  }, []);

  useEffect(() => {
    SystemNavigationBar.navigationHide();
  }, []);

  return (
    <I18nextProvider i18n={i18ne}>
      <AuthProvider>
        <NetworkProvider>
          <AppContent />
        </NetworkProvider>
      </AuthProvider>
    </I18nextProvider>
  );
};

export default App;
