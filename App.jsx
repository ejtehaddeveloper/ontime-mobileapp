/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {AuthProvider} from './src/context/AuthContext';
import {NetworkProvider} from './src/assets/common/NetworkStatus';
import i18n from './src/assets/locales/i18';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {I18nextProvider, useTranslation} from 'react-i18next';
import NotificationHandler from './src/assets/common/NotificationHandler';
import {
  I18nManager,
  StatusBar,
  Text,
  Platform,
  DevSettings,
  SafeAreaView,
} from 'react-native';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import {useNetwork} from './src/assets/common/NetworkStatus';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {Colors} from './src/assets/constants';
import Orientation from 'react-native-orientation-locker';
import Splash from './src/Screens/Splash';

const Stack = createStackNavigator();

const MainNavigator = React.memo(() => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen
        name="Splash2"
        getComponent={() => require('./src/Screens/Splash2').default}
      />
      <Stack.Screen
        name="Auth"
        getComponent={() => require('./src/navigation/Auth').default}
      />
      <Stack.Screen
        name="App"
        getComponent={() => require('./src/navigation/AppN').default}
      />
    </Stack.Navigator>
  );
});
const NoInternetScreen = React.memo(() => {
  const {t} = useTranslation();
  return (
    <SafeAreaView
      style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <MaterialIcons name="wifi-off" color={Colors.primary} size={70} />
      <Text style={{fontSize: 18, fontWeight: 'bold', color: Colors.primary}}>
        {t('No internet connection')}
      </Text>
    </SafeAreaView>
  );
});
const AppContent = React.memo(() => {
  const isConnected = useNetwork();

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <NotificationHandler />
      {isConnected ? <MainNavigator /> : <NoInternetScreen />}
    </NavigationContainer>
  );
});
const App = () => {
  const [isReady, setIsReady] = useState(false);
  const reloadedRef = useRef(false);
  const fetchLanguageAndApply = useCallback(async () => {
    try {
      const storedLang = await AsyncStorage.getItem('language');
      if (storedLang) {
        if (i18n.language !== storedLang) {
          await i18n.changeLanguage(storedLang);
        }
        const shouldRTL = storedLang === 'ar' || storedLang === 'he' || storedLang === 'fa';
        if (I18nManager.isRTL !== shouldRTL) {
          I18nManager.forceRTL(shouldRTL);
          if (!reloadedRef.current) {
            reloadedRef.current = true;
            setTimeout(() => {
              try {
                DevSettings.reload();
              } catch (e) {
              }
            }, 450);
            return; 
          }
        }
      }
    } catch (e) {
    }
  }, []);

  const prepare = useCallback(async () => {
    try {
      Orientation.lockToPortrait();
    } catch (e) {
      // ignore
    }

    try {
      if (Platform.OS === 'android' && SystemNavigationBar?.navigationHide) {
        SystemNavigationBar.navigationHide();
      }
    } catch (e) {
      // ignore
    }

    await fetchLanguageAndApply();

    setIsReady(true);
  }, [fetchLanguageAndApply]);

  useEffect(() => {
    prepare();
  }, []);

  if (!isReady) {
    return <Splash />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <NetworkProvider>
          <AppContent />
        </NetworkProvider>
      </AuthProvider>
    </I18nextProvider>
  );
};

export default App;

