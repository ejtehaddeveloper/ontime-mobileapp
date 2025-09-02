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
  Image,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  Switch,
  TextInput,
  I18nManager,
  Linking,
  Alert,
  ScrollView,
  SafeAreaView,
  Platform,
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

/**
 * Profile screen — fixes:
 * 1) Avoid flicker when typing in Edit name modal by moving the typing state
 *    into the modal (local state) and committing only on confirm.
 * 2) Fix Language modal props mismatch and make language change reliably call
 *    changeLanguage + persist setting + restart for RTL changes.
 * 3) Minor performance/readability improvements (memoized static objects).
 *
 * Notes:
 * - Edit flow no longer causes parent to re-render on every keystroke.
 * - Language modal now receives initial language and calls parent's handler.
 */

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

  // ---- static images (single source per language) ----
  const images = useMemo(
    () => ({
      ar: require('../../assets/images/ar.png'),
      en: require('../../assets/images/en.png'),
    }),
    [],
  );

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
      if (mountedRef.current) setUserInfo(data);
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
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
  const handleWhatsAppPress = useCallback(async () => {
    const phoneNumber = '+97430541411';
    const message = i18n.language === 'ar' ? 'مرحبا !' : 'Hello!';
    const appUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(
      message,
    )}`;
    const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message,
    )}`;

    try {
      const supported = await Linking.canOpenURL(appUrl);
      if (supported) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      Alert.alert(
        t('Error'),
        t('An error occurred while trying to open WhatsApp'),
      );
    }
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
    /**
     * Called by child Edit modal when user confirms.
     * We fetch data after successful update to reflect server state.
     */
    async newName => {
      if (!newName || newName.trim().length === 0) {
        Alert.alert(t('Error'), t('Name cannot be empty'));
        return false;
      }
      try {
        const response = await updateUsers(newName.trim());
        if (response) {
          // re-fetch user
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

  // ---- SettingRow component (lightweight) ----
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

  // ---- ModalWrapper WITHOUT animation (instant show/hide) ----
  const ModalWrapperNoAnimation = useCallback(
    ({
      visible,
      onRequestClose,
      children,
      backdropPressCloses = true,
      testID,
    }) => {
      if (!visible) return null;

      return (
        <Modal
          visible={visible}
          transparent
          animationType="none"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          hardwareAccelerated
          onRequestClose={onRequestClose}
          testID={testID}>
          <View style={styles.simpleModalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() =>
                backdropPressCloses && onRequestClose && onRequestClose()
              }
            />
            <View style={styles.simpleModalCard}>{children}</View>
          </View>
        </Modal>
      );
    },
    [],
  );

  // ---- Language modal (fixed props and behavior) ----
  const LanguageModal = React.memo(
    ({visible, onClose, initialLang = 'en', onConfirmLanguage}) => {
      // local tempLang so selecting options doesn't update parent state repeatedly
      const [localTemp, setLocalTemp] = useState(initialLang);

      // sync when modal opens
      useEffect(() => {
        if (visible) setLocalTemp(initialLang);
      }, [visible, initialLang]);

      const selectLocal = useCallback(lang => setLocalTemp(lang), []);

      const confirm = useCallback(async () => {
        if (onConfirmLanguage) await onConfirmLanguage(localTemp);
        onClose && onClose();
      }, [localTemp, onConfirmLanguage, onClose]);

      return (
        <ModalWrapperNoAnimation
          visible={visible}
          onRequestClose={onClose}
          backdropPressCloses={false}
          testID="language-modal">
          <Text style={styles.modalTitle}>{t('Choose a Language')}</Text>

          <View style={{marginTop: 12}}>
            <TouchableOpacity
              activeOpacity={0.78}
              style={[
                styles.simpleOption,
                localTemp === 'ar' && styles.simpleOptionSelected,
              ]}
              onPress={() => selectLocal('ar')}>
              <Text
                style={[
                  styles.simpleOptionText,
                  localTemp === 'ar' && {color: Colors.primary},
                ]}>
                عربي
              </Text>

              <View style={styles.flagWrapper}>
                <Image
                  source={images.ar}
                  style={styles.langSmallFlag}
                  resizeMode="contain"
                />
                {localTemp === 'ar' && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.78}
              style={[
                styles.simpleOption,
                localTemp === 'en' && styles.simpleOptionSelected,
              ]}
              onPress={() => selectLocal('en')}>
              <Text
                style={[
                  styles.simpleOptionText,
                  localTemp === 'en' && {color: Colors.primary},
                ]}>
                English
              </Text>

              <View style={styles.flagWrapper}>
                <Image
                  source={images.en}
                  style={styles.langSmallFlag}
                  resizeMode="contain"
                />
                {localTemp === 'en' && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 14,
              }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.simpleCancelBtn}
                onPress={onClose}>
                <Text style={styles.simpleCancelText}>{t('Cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.simpleConfirmBtn,
                  {backgroundColor: localTemp ? Colors.primary : '#ccc'},
                ]}
                onPress={confirm}
                disabled={!localTemp}>
                <Text style={styles.simpleConfirmText}>{t('Change')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ModalWrapperNoAnimation>
      );
    },
  );

  // ---- Edit modal (LOCAL typing state to avoid parent re-renders) ----
  const EditModal = ({visible, onClose, initialValue, onConfirm}) => {
    const [localName, setLocalName] = useState(initialValue ?? '');

    // When modal opens with different initial value, sync once
    useEffect(() => {
      if (visible) setLocalName(initialValue ?? '');
    }, [visible, initialValue]);

    const submit = useCallback(async () => {
      if (!localName || localName.trim().length === 0) {
        Alert.alert(t('Error'), t('Name cannot be empty'));
        return;
      }
      const ok = await onConfirm(localName.trim());
      if (ok) {
        onClose && onClose();
      } else {
        // keep modal open for retry
      }
    }, [localName, onConfirm, onClose]);

    return (
      <ModalWrapperNoAnimation
        visible={visible}
        onRequestClose={onClose}
        backdropPressCloses={false}
        testID="edit-modal">
        <Text style={styles.modalTitle}>{t('Edit your name')}</Text>
        <TextInput
          placeholder={t('Enter your name')}
          value={localName}
          onChangeText={setLocalName}
          style={styles.input}
          placeholderTextColor={Colors.black3}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 14,
          }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.simpleCancelBtn}
            onPress={onClose}>
            <Text style={styles.simpleCancelText}>{t('Cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.simpleConfirmBtn, {backgroundColor: Colors.primary}]}
            onPress={submit}>
            <Text style={styles.simpleConfirmText}>{t('Confirm')}</Text>
          </TouchableOpacity>
        </View>
      </ModalWrapperNoAnimation>
    );
  };

  // ---- Confirm modal stays simple ----
  const ConfirmModal = ({
    visible,
    title,
    iconName,
    onCancel,
    onConfirm,
    cancelText = t('Cancel'),
    confirmText = t('Confirm'),
    confirmColor = Colors.primary,
    iconColor,
  }) => (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}>
      <View style={styles.simpleModalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.simpleModalCard}>
          <View style={{alignItems: 'center', marginBottom: 8}}>
            <Ionicons
              name={iconName}
              size={26}
              color={iconColor ?? Colors.primary}
            />
          </View>
          <Text style={styles.modalTitle}>{title}</Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 14,
            }}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.simpleCancelBtn}
              onPress={onCancel}>
              <Text style={styles.simpleCancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.simpleConfirmBtn, {backgroundColor: confirmColor}]}
              onPress={onConfirm}>
              <Text style={styles.simpleConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ---- UI ----
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={[styles.container, {direction: isRTL ? 'rtl' : 'ltr'}]}
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

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},
  container: {flex: 1, backgroundColor: '#fff'},
  header: {marginTop: 18, alignItems: 'center'},
  title: {fontSize: 22, fontWeight: '800', color: '#111'},

  profileCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: {width: 0, height: 8},
        shadowRadius: 16,
      },
      android: {elevation: 3},
    }),
  },
  profileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameText: {fontSize: 18, fontWeight: '700', color: '#111'},
  phoneText: {fontSize: 13, color: Colors.primary, marginTop: 4},
  editIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    backgroundColor: '#fff',
  },

  section: {marginTop: 20, marginHorizontal: 16},
  sectionTitle: {fontSize: 16, fontWeight: '800', marginBottom: 12},
  rowCard: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowOffset: {width: 0, height: 4},
        shadowRadius: 8,
      },
      android: {elevation: 1},
    }),
  },
  pressedRow: {opacity: 0.85},
  rowLeft: {flexDirection: 'row', alignItems: 'center'},
  rowText: {fontSize: 15},
  rowRight: {},
  smallText: {fontSize: 14, color: '#666'},

  // simple modal backdrop and card
  simpleModalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  simpleModalCard: {
    width: '88%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: {width: 0, height: 8},
        shadowRadius: 12,
      },
      android: {elevation: 6},
    }),
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderColor: '#E8E8E8',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginTop: 8,
  },

  // language options
  simpleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 8,
  },
  simpleOptionSelected: {
    backgroundColor: 'rgba(52,76,183,0.04)',
    borderColor: Colors.primary,
  },
  simpleOptionText: {fontSize: 16, flexShrink: 1},

  // flag wrapper & badge
  flagWrapper: {
    width: 36,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginLeft: 8,
  },
  langSmallFlag: {width: 28, height: 18},

  // small check badge shown inside the flag box when selected
  checkBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // buttons
  simpleCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  simpleCancelText: {fontSize: 15, color: '#333'},
  simpleConfirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  simpleConfirmText: {fontSize: 15, color: '#fff', fontWeight: '700'},
});

export default Profile;
