/* eslint-disable react-native/no-inline-styles */
import React, {useEffect} from 'react';
import {I18nManager, StatusBar, View, Text, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {AuthProvider} from './src/context/AuthContext';
import {NetworkProvider, useNetwork} from './src/assets/common/NetworkStatus';
import i18n, {i18n as i18ne} from './src/assets/locales/i18';
import {I18nextProvider, t} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationHandler from './src/assets/common/NotificationHandler';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import Orientation from 'react-native-orientation-locker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {Colors} from './src/assets/constants';
import {enableScreens} from 'react-native-screens';

import Splash from './src/Screens/Splash';
import Splash2 from './src/Screens/Splash2';
import Auth from './src/navigation/Auth';
import AppN from './src/navigation/AppN';

// Enable react-native-screens for better navigation performance
enableScreens();

// Stack navigator
const Stack = createStackNavigator();

// Main navigator stack
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

// No internet screen memoized to prevent unnecessary re-renders
const NoInternetScreen = React.memo(() => (
  <View style={styles.noInternetContainer}>
    <MaterialIcons name="wifi-off" color={Colors.primary} size={70} />
    <Text style={styles.noInternetText}>{t('No internet connection')}</Text>
  </View>
));

// Optional overlay for network status (non-blocking)
const NoInternetOverlay = React.memo(() => (
  <View style={styles.overlayContainer}>
    <MaterialIcons name="wifi-off" color="#fff" size={24} />
    <Text style={styles.overlayText}>{t('No internet connection')}</Text>
  </View>
));

// App content with navigation
const AppContent = () => {
  const isConnected = useNetwork();

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <NotificationHandler />
      <MainNavigator />
      {!isConnected && <NoInternetOverlay />}
    </NavigationContainer>
  );
};

// Root app
const App = () => {
  // Combine all startup effects into a single effect
  useEffect(() => {
    // Lock orientation
    Orientation.lockToPortrait();

    // Hide system navigation bar
    SystemNavigationBar.navigationHide();

    // Fetch stored language and set RTL if needed
    (async () => {
      const storedLang = await AsyncStorage.getItem('language');
      if (storedLang) {
        i18n.changeLanguage(storedLang);
        I18nManager.forceRTL(storedLang === 'ar');
      }
    })();
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

// Styles moved to StyleSheet for performance
const styles = StyleSheet.create({
  noInternetContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  noInternetText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 10,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
    padding: 10,
    alignItems: 'center',
    zIndex: 999,
    flexDirection: 'row',
  },
  overlayText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default App;
