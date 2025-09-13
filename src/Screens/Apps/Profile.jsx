/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  TouchableOpacity,
  Text,
  View,
  Switch,
  I18nManager,
  Linking,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {AuthContext} from '../../context/AuthContext';
import {useNavigation} from '@react-navigation/native';
import {DeleteUsers, getusers, Logout, updateUsers} from '../../context/api';
import Loading from '../../assets/common/Loading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../assets/locales/i18';
import {t} from 'i18next';
import messaging from '@react-native-firebase/messaging';
import ReactNativeRestart from 'react-native-restart';
import styles from '../../components/profile/proStyles';
import LanguageModal from '../../components/profile/LanguageModal';
import ConfirmModal from '../../components/profile/ConfirmModal';
import EditModal from '../../components/profile/EditModal';

const Profile = () => {
  // ---- state ----
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [selectedLang, setSelectedLang] = useState(() => i18n.language || 'en');
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  const isRTL = useMemo(() => i18n.language === 'ar', []);
  const mountedRef = useRef(true);

  const {logout2, isAuth} = useContext(AuthContext);
  const navigation = useNavigation();

  // ---- lifecycle ----
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('notificationsEnabled');
        if (stored !== null && mountedRef.current) {
          setNotificationsEnabled(JSON.parse(stored));
        }
      } catch (e) {
        console.log('Error reading notification setting', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isAuth) {
      setUserInfo(null);
      setLoading(false);
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  // keep displayed name in sync with fetched user (used when opening edit modal)
  useEffect(() => {
    if (mountedRef.current && userInfo?.name) {
      // don't keep mirrored "live" state here (avoids typing flicker)
    }
  }, [userInfo?.name]);

  // ---- fetch user data ----
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getusers();
      if (mountedRef.current) {
        setUserInfo(data);
      }
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // ---- language flow ----
  const openLanguageModal = useCallback(() => {
    setLangModalVisible(true);
  }, []);

  const applyLanguageChange = useCallback(async newLang => {
    // newLang = 'en' | 'ar'
    try {
      // persist immediately
      await AsyncStorage.setItem('language', newLang);
    } catch (err) {
      console.log('Error persisting language', err);
    }

    try {
      // change i18n language
      await i18n.changeLanguage(newLang);
    } catch (err) {
      console.log('i18n.changeLanguage error', err);
    }

    try {
      // apply RTL if needed (forceRTL returns boolean)
      const shouldRTL = newLang === 'ar';
      if (I18nManager.isRTL !== shouldRTL) {
        // Force and restart to apply RTL layout safely
        I18nManager.forceRTL(shouldRTL);
        ReactNativeRestart.restart();
        return; // app will restart
      } else {
        // no restart needed if RTL state unchanged — still update selectedLang
        setSelectedLang(newLang);
      }
    } catch (err) {
      console.log('Error applying RTL change', err);
    }
  }, []);

  // ---- notification toggle ----
  const toggleNotifications = useCallback(async () => {
    const newStatus = !notificationsEnabled;
    setNotificationsEnabled(newStatus);
    try {
      await AsyncStorage.setItem(
        'notificationsEnabled',
        JSON.stringify(newStatus),
      );
    } catch (e) {
      console.log('Error saving notification setting', e);
    }

    if (newStatus) {
      try {
        await messaging().requestPermission();
        const token = await messaging().getToken();
        console.log('FCM Token:', token);
      } catch (error) {
        console.log('Error enabling notifications:', error);
      }
    } else {
      try {
        await messaging().deleteToken();
        console.log('Notifications Disabled');
      } catch (error) {
        console.log('Error disabling notifications:', error);
      }
    }
  }, [notificationsEnabled]);

  // ---- WhatsApp ----
  const handleWhatsAppPress = useCallback(() => {
    const phoneNumber = '+97430541411';
    const message = i18n.language === 'ar' ? 'مرحبا !' : 'Hello!';
    const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message,
    )}`;
    Linking.openURL(webUrl).catch(() => {
      Alert.alert(t('Error'), t('Unable to open WhatsApp web link.'));
    });
  }, []);

  // ---- logout / delete / edit ----
  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      ReactNativeRestart.restart();
      navigation.reset({index: 0, routes: [{name: 'Splash'}]});
      await Logout(logout2);
    } catch (error) {
      console.log('Error during logout', error);
    }
  }, [navigation, logout2]);

  const Delete = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      ReactNativeRestart.restart();
      navigation.reset({index: 0, routes: [{name: 'Splash'}]});
      await DeleteUsers(logout2);
    } catch (error) {
      console.log('error', error);
    }
  }, [navigation, logout2]);

  const performUpdateName = useCallback(
    async newName => {
      if (!newName || newName.trim().length === 0) {
        Alert.alert(t('Error'), t('Name cannot be empty'));
        return false;
      }
      try {
        const response = await updateUsers(newName.trim());
        if (response) {
          await fetchData();
          return true;
        }
      } catch (error) {
        console.log('error', error);
      }
      return false;
    },
    [fetchData],
  );

  const SettingRow = useCallback(({icon, label, onPress, rightElement}) => {
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => [styles.rowCard, pressed && styles.pressedRow]}>
        <View style={styles.rowLeft}>
          <Ionicons
            name={icon}
            size={22}
            color={Colors.primary}
            style={{marginRight: 10}}
          />
          <Text style={styles.rowText}>{label}</Text>
        </View>
        <View style={styles.rowRight}>{rightElement}</View>
      </Pressable>
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={[styles.container]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.header}>
          <Text style={styles.title}>{t('Account')}</Text>
        </View>

        {isAuth && (
          <View style={styles.profileCard}>
            {loading ? (
              <Loading />
            ) : (
              <View style={styles.profileInner}>
                <View>
                  <Text style={styles.nameText}>{userInfo?.name ?? '-'}</Text>
                  <Text style={styles.phoneText}>
                    {userInfo?.phone_number
                      ? userInfo.phone_number.slice(4)
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setEditVisible(true)}
                  style={styles.editIcon}>
                  <FontAwesome name="pencil" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('My Account')}</Text>

          <SettingRow
            icon="globe-outline"
            label={t('Language')}
            onPress={openLanguageModal}
            rightElement={
              <Text style={styles.smallText}>
                {selectedLang === 'en' ? 'English' : 'عربي'}
              </Text>
            }
          />

          <SettingRow
            icon="shield-checkmark-outline"
            label={t('Privacy Policy')}
          />
        </View>

        {isAuth && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('Notifications')}</Text>

            <SettingRow
              icon="notifications-outline"
              label={t('Push Notifications')}
              rightElement={
                <Switch
                  trackColor={{false: '#D5D5D5', true: Colors.primary}}
                  thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                  onValueChange={toggleNotifications}
                  value={notificationsEnabled}
                />
              }
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('More')}</Text>

          <SettingRow
            icon="logo-whatsapp"
            label={t('Customer Service')}
            onPress={handleWhatsAppPress}
          />

          {isAuth && (
            <SettingRow
              icon="trash-outline"
              label={t('Delete your Account')}
              onPress={() => setConfirmDeleteVisible(true)}
            />
          )}

          <SettingRow
            icon={isAuth ? 'log-out-outline' : 'log-in-outline'}
            label={isAuth ? t('Logout') : t('Login')}
            onPress={() =>
              isAuth
                ? setConfirmLogoutVisible(true)
                : navigation.navigate('Auth')
            }
          />
        </View>

        {/* Modals */}
        <LanguageModal
          visible={langModalVisible}
          onClose={() => setLangModalVisible(false)}
          initialLang={selectedLang}
          onConfirmLanguage={applyLanguageChange}
        />

        <ConfirmModal
          visible={confirmLogoutVisible}
          title={t('Are you sure you want to Log out?')}
          iconName="log-out-outline"
          onCancel={() => setConfirmLogoutVisible(false)}
          onConfirm={logout}
          confirmText={t('Logout')}
        />

        <ConfirmModal
          visible={confirmDeleteVisible}
          title={t('Are you sure you want to delete your account?')}
          iconName="trash-outline"
          iconColor="red"
          onCancel={() => setConfirmDeleteVisible(false)}
          onConfirm={Delete}
          confirmText={t('Delete')}
          confirmColor="red"
        />

        <EditModal
          visible={editVisible}
          onClose={() => setEditVisible(false)}
          initialValue={userInfo?.name ?? ''}
          onConfirm={performUpdateName}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
