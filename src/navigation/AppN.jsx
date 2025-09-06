/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/no-unstable-nested-components */
import React, {useContext, useEffect, useState} from 'react';
import {
  Home,
  Salon,
  Service,
  DateBook,
  Notifications,
  Favorites,
  Profile,
  Booking,
  BookingDetails,
  Cart,
  View_all,
  View_all2,
  ChangeAppointment,
} from '../Screens/Apps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../assets/constants';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Platform, Text, View} from 'react-native';
import {GetNotifications} from '../context/api';
import {AuthContext} from '../context/AuthContext';
import {t} from 'i18next';
import i18n from '../assets/locales/i18';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);
  const {isAuth} = useContext(AuthContext);

  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const response = await GetNotifications();
        if (isMounted && response) {
          setUnreadCount(response.unread_count);
        }
      } catch (error) {
        console.log('Error fetching notifications:', error);
      }
    };

    if (isAuth) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 5000);
      return () => {
        clearInterval(interval);
        isMounted = false;
      };
    }
  }, [isAuth]);

  // Get bottom safe area inset using react-native-safe-area-context
  const insets = useSafeAreaInsets();
  console.log('Bottom inset:', insets.bottom);
  useEffect(() => {
    console.log('Current language:', i18n.language);
    console.log('Bottom inset changed:', insets.bottom);
  }, [insets.bottom]);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          height: 65,
          paddingVertical: insets.bottom + 25,
          paddingHorizontal: Platform.OS === 'ios' ? 5 : 5,
        },
      }}>
      {[
        {name: 'Home', component: Home, icon: 'home'},
        {name: 'Booking', component: Booking, icon: 'reader'},
      ].map(({name, component, icon}) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarIcon: ({size, focused}) => (
              <Ionicons
                name={icon}
                size={size}
                color={focused ? Colors.primary : Colors.black3}
              />
            ),
            tabBarLabel: ({focused}) => (
              <Text
                style={{
                  color: focused ? Colors.primary : Colors.black3,
                  fontSize: i18n.language === 'ar' ? 7 : 8,
                }}>
                {t(name)}
              </Text>
            ),
          }}
        />
      ))}

      {/* Notification tab in between Booking and Favorites */}
      <Tab.Screen
        name="Notifications"
        component={Notifications}
        options={{
          tabBarIcon: ({size, focused}) => (
            <View style={{position: 'relative'}}>
              <Ionicons
                name="notifications"
                size={size}
                color={focused ? Colors.primary : Colors.black3}
              />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    right: -5,
                    top: -2,
                    minWidth: 14,
                    height: 14,
                    borderRadius: 7,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 2,
                    backgroundColor: 'red',
                  }}>
                  <Text
                    style={{color: 'white', fontSize: 10, fontWeight: 'bold'}}>
                    {unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
          tabBarLabel: ({focused}) => (
            <Text
              style={{
                color: focused ? Colors.primary : Colors.black3,
                fontSize: i18n.language === 'ar' ? 7 : 8,
              }}>
              {t('Notifications')}
            </Text>
          ),
        }}
      />

      {[
        {name: 'Favorites', component: Favorites, icon: 'heart'},
        {name: 'Profile', component: Profile, icon: 'person'},
      ].map(({name, component, icon}) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarIcon: ({size, focused}) => (
              <Ionicons
                name={icon}
                size={size}
                color={focused ? Colors.primary : Colors.black3}
              />
            ),
            tabBarLabel: ({focused}) => (
              <Text
                style={{
                  color: focused ? Colors.primary : Colors.black3,
                  fontSize: i18n.language === 'ar' ? 7 : 8,
                }}>
                {t(name)}
              </Text>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

import {SafeAreaProvider} from 'react-native-safe-area-context';

const AppN = () => {
  return (
    <SafeAreaProvider>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="MainTab" component={MainTabNavigator} />
        {[
          {name: 'Salon', component: Salon},
          {name: 'Service', component: Service},
          {name: 'DateBook', component: DateBook},
          {name: 'BookingDetails', component: BookingDetails},
          {name: 'Cart', component: Cart},
          {name: 'View_all', component: View_all},
          {name: 'View_all2', component: View_all2},
          {name: 'ChangeAppointment', component: ChangeAppointment},
        ].map(({name, component}) => (
          <Stack.Screen key={name} name={name} component={component} />
        ))}
      </Stack.Navigator>
    </SafeAreaProvider>
  );
};

export default AppN;
