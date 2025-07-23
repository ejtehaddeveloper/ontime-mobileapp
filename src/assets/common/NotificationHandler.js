import {useEffect, useState} from 'react';
import messaging from '@react-native-firebase/messaging';
import {useNavigation} from '@react-navigation/native';
import {Platform, PermissionsAndroid, Vibration} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationHandler = () => {
  const navigation = useNavigation();
  const [notificationCount, setNotificationCount] = useState(0);

  const getDeviceToken = async () => {
    try {
      const authStatus = await messaging().hasPermission();
      if (authStatus !== messaging.AuthorizationStatus.AUTHORIZED) {
        await messaging().requestPermission();
      }

      const token = await messaging().getToken();
      console.log('FCM Token:', token);

      await AsyncStorage.setItem('fcm_token', token);

      return token;
    } catch (error) {
      console.log('Error fetching FCM token:', error);
      return null;
    }
  };

  const requestUserPermission = async () => {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('Authorization status:', enabled ? 'Granted' : 'Denied');
    } else {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
    }
  };

  useEffect(() => {
    requestUserPermission();
    getDeviceToken();

    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('Received foreground notification:', remoteMessage);
      Vibration.vibrate();
      setNotificationCount(prevCount => prevCount + 1);
    });

    // Handle notifications in background
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Notification in background 📩 : ', remoteMessage);
      setNotificationCount(prevCount => prevCount + 1);
    });

    // Handle notification when app is in background or closed
    const unsubscribeOnNotificationOpenedApp =
      messaging().onNotificationOpenedApp(remoteMessage => {
        if (remoteMessage?.data?.screen) {
          const params = JSON.parse(remoteMessage.data.params || '{}');
          navigation.navigate('Notifications', params);
        }
      });

    // Open app from closed state
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage?.data?.screen) {
          const params = JSON.parse(remoteMessage.data.params || '{}');
          navigation.navigate('Notifications', params);
        }
      });

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
    };
  }, [navigation]);

  return null;
};

export default NotificationHandler;
