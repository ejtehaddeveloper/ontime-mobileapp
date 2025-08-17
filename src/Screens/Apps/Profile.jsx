/* eslint-disable react-native/no-inline-styles */
import React, {useContext, useEffect, useState} from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
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
import RNRestart from 'react-native-restart';

const isRTL = i18n.language === 'ar';

const Profile = () => {
  const [isLangModal, setLangModal] = useState(false);
  //   const [isLan, setLan] = useState(false);
  const [selectedLang, setSelectedLang] = useState(i18n.language);
  const [isDeleteModal, setDeleteModal] = useState(false);
  const [isLogoutModal, setLogoutModal] = useState(false);
  const [isEditModal, setEditModal] = useState(false);
  const [isSwitchOn, setIsSwitchOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState([]);
  const [Name, setName] = useState(userInfo?.name || '');

  useEffect(() => {
    const checkNotificationStatus = async () => {
      const storedStatus = await AsyncStorage.getItem('notificationsEnabled');
      if (storedStatus !== null) {
        setIsSwitchOn(JSON.parse(storedStatus));
      }
    };

    checkNotificationStatus();
  }, []);

  const {logout2} = useContext(AuthContext);

  useEffect(() => {
    if (isAuth) {
      fetchData();
    }
  }, [isAuth, navigation]);
  const fetchData = async () => {
    try {
      const Data = await getusers();
      setUserInfo(Data);
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const images = {
    ar: require('../../assets/images/ar.png'),
    ar2: require('../../assets/images/ar2.png'),
    en: require('../../assets/images/en.png'),
    en2: require('../../assets/images/en2.png'),
  };

  const handleLangSelect = lang => {
    setSelectedLang(lang);
    // setLan(lang);
  };

  const handleContinue = async () => {
    console.log('Selected Language:', selectedLang);
    try {
      await AsyncStorage.setItem('language', selectedLang);
      await i18n.changeLanguage(selectedLang);

      await I18nManager.forceRTL(selectedLang === 'ar');

      // navigation.dispatch(
      //   CommonActions.reset({
      //     index: 0,
      //     routes: [{name: 'Home'}],
      //   }),
      // );
      RNRestart.restart();
    } catch (error) {
      console.log('Error changing language:', error);
    }
    setLangModal(false);
  };

  const {isAuth} = useContext(AuthContext);

  const navigation = useNavigation();

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      ReactNativeRestart.restart();
      navigation.reset({
        index: 0,
        routes: [{name: 'Splash'}],
      });
      await Logout(logout2);
    } catch (error) {
      console.log('Error during logout', error);
    }
  };

  const Delete = async () => {
    try {
      console.log('Deleted success !!!!!!!!!!!!!!!!!');
      await AsyncStorage.removeItem('auth_token');
      ReactNativeRestart.restart();
      navigation.reset({
        index: 0,
        routes: [{name: 'Splash'}],
      });
      await DeleteUsers(logout2);
    } catch (error) {
      console.log('error', error);
    }
  };

  const Edit = async () => {
    try {
      const response = await updateUsers(Name);
      if (response) {
        setEditModal(false);
        handleRefresh();
      }
    } catch (error) {
      console.log('error', error);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
    setLoading(false);
  };

  const toggleSwitch = async () => {
    const newStatus = !isSwitchOn;
    setIsSwitchOn(newStatus);
    await AsyncStorage.setItem(
      'notificationsEnabled',
      JSON.stringify(newStatus),
    );

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
  };

  const handleWhatsAppPress = async () => {
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
        //Alert.alert(t('Error'), t('WhatsApp is not installed on your device'));
      }
    } catch (error) {
      Alert.alert(
        t('Error'),
        t('An error occurred while trying to open WhatsApp'),
      );
    }
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.header}>
          <Text style={styles.title}>{t('Account')}</Text>
        </View>
        {isAuth && (
          <>
            {loading ? (
              <Loading />
            ) : (
              <View style={styles.header}>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <Text style={styles.title2}>{userInfo?.name}</Text>
                  <FontAwesome
                    name="pencil"
                    size={25}
                    color={Colors.primary}
                    onPress={() => setEditModal(true)}
                  />
                </View>
                <Text style={{fontSize: 10, color: Colors.primary}}>
                  {userInfo?.phone_number.slice(
                    4,
                    userInfo?.phone_number.length,
                  )}
                </Text>
              </View>
            )}
          </>
        )}
        <View style={styles.body}>
          <View style={{marginBottom: 25}}>
            <Text style={[styles.title3, {alignSelf: 'flex-start'}]}>
              {t('My Account')}
            </Text>
            <TouchableOpacity
              style={[styles.row, {justifyContent: 'space-between'}]}
              onPress={() => setLangModal(true)}>
              <View style={styles.row}>
                <Ionicons
                  name="globe-outline"
                  size={25}
                  color={Colors.primary}
                />
                <Text style={styles.text}>{t('Language')}</Text>
              </View>
              <Text style={[styles.text, {top: 18, fontSize: 14}]}>
                {selectedLang === 'en' ? 'English' : 'عربي'}
              </Text>
            </TouchableOpacity>
            <View style={styles.row}>
              <Ionicons
                name="shield-checkmark-outline"
                size={25}
                color={Colors.primary}
              />
              <Text style={styles.text}>{t('Privacy Policy')}</Text>
            </View>
          </View>
          {isAuth && (
            <View style={{marginBottom: 25}}>
              <Text style={styles.title3}>{t('Notifications')}</Text>
              <View style={[styles.row, {justifyContent: 'space-between'}]}>
                <View style={styles.row}>
                  <Ionicons
                    name="notifications-outline"
                    size={25}
                    color={Colors.primary}
                  />
                  <Text style={styles.text}>{t('Push Notifications')}</Text>
                </View>
                <View style={styles.switchContainer}>
                  <Switch
                    trackColor={{false: '#D5D5D5', true: Colors.primary}}
                    thumbColor={isSwitchOn ? '#fff' : '#f4f3f4'}
                    onValueChange={toggleSwitch}
                    value={isSwitchOn}
                  />
                </View>
              </View>
            </View>
          )}
          <View style={{marginBottom: 25}}>
            <Text style={styles.title3}>{t('More')}</Text>
            <TouchableOpacity style={styles.row} onPress={handleWhatsAppPress}>
              <Ionicons name="logo-whatsapp" size={25} color={Colors.primary} />
              <Text style={styles.text}>{t('Customer Service')}</Text>
            </TouchableOpacity>
            {isAuth && (
              <TouchableOpacity
                style={styles.row}
                onPress={() => setDeleteModal(true)}>
                <Ionicons
                  name="trash-outline"
                  size={25}
                  color={Colors.primary}
                />
                <Text style={styles.text}>{t('Delete your Account')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.row}
              onPress={() => [
                isAuth ? setLogoutModal(true) : navigation.navigate('Auth'),
              ]}>
              <Ionicons
                name={isAuth ? 'log-out-outline' : 'log-in-outline'}
                size={25}
                color={Colors.primary}
              />
              <Text style={styles.text}>
                {isAuth ? t('Logout') : t('Login')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/*Modals*/}
        <Modal visible={isLangModal} transparent={true} animationType="slide">
          <Pressable style={styles.modalContainer}>
            <Pressable style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('Choose a Language')}</Text>
                <Ionicons
                  name="close-outline"
                  size={25}
                  onPress={() => setLangModal(false)}
                />
              </View>
              <View style={styles.modalBody}>
                <TouchableOpacity
                  style={[
                    styles.langButton,
                    selectedLang === 'ar' && styles.selectedButton,
                  ]}
                  onPress={() => handleLangSelect('ar')}>
                  <Text
                    style={[
                      styles.langText,
                      selectedLang === 'ar' && {color: Colors.primary},
                    ]}>
                    عربي
                  </Text>
                  <Image
                    source={selectedLang === 'ar' ? images.ar2 : images.ar}
                    style={styles.image2}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.langButton,
                    selectedLang === 'en' && styles.selectedButton,
                  ]}
                  onPress={() => handleLangSelect('en')}>
                  <Text
                    style={[
                      styles.langText,
                      selectedLang === 'en' && {color: Colors.primary},
                    ]}>
                    English
                  </Text>
                  <Image
                    source={selectedLang === 'en' ? images.en : images.en2}
                    style={styles.image}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    {
                      backgroundColor: selectedLang ? Colors.primary : '#ccc',
                    },
                  ]}
                  onPress={handleContinue}
                  disabled={!selectedLang}>
                  <Text style={styles.continueText}>{t('Change')}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
        <Modal visible={isLogoutModal} transparent={true} animationType="slide">
          <Pressable style={styles.modalContainer}>
            <Pressable style={styles.modalContent}>
              <View
                style={{
                  marginTop: 15,
                  alignItems: 'center',
                  marginBottom: 25,
                }}>
                <Ionicons
                  name="log-out-outline"
                  size={30}
                  color={Colors.primary}
                />
              </View>
              <Text style={[styles.modalTitle, {marginBottom: 45}]}>
                {t('Are you sure you want to Log out?')}
              </Text>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={{
                    width: 102,
                    height: 38,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    borderRadius: 12,
                  }}
                  onPress={() => setLogoutModal(false)}>
                  <Text style={styles.modalTitle}>{t('Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    width: 102,
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: Colors.primary,
                    borderRadius: 12,
                  }}
                  onPress={logout}>
                  <Text style={[styles.modalTitle, {color: '#fff'}]}>
                    {t('Logout')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
        <Modal visible={isDeleteModal} transparent={true} animationType="slide">
          <Pressable style={styles.modalContainer}>
            <Pressable style={styles.modalContent}>
              <View
                style={{
                  marginTop: 15,
                  alignItems: 'center',
                  marginBottom: 25,
                }}>
                <Ionicons name="trash-outline" size={25} color={'red'} />
              </View>
              <Text style={[styles.modalTitle, {marginBottom: 45}]}>
                {t('Are you sure you want to delete your account?')}
              </Text>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={{
                    width: 102,
                    height: 38,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    borderRadius: 12,
                  }}
                  onPress={() => setDeleteModal(false)}>
                  <Text style={styles.modalTitle}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    width: 102,
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'red',
                    borderRadius: 12,
                  }}
                  onPress={Delete}>
                  <Text style={[styles.modalTitle, {color: '#fff'}]}>
                    {t('Delete')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
        <Modal visible={isEditModal} transparent={true} animationType="slide">
          <Pressable style={styles.modalContainer}>
            <Pressable style={styles.modalContent}>
              <View
                style={{
                  marginTop: 15,
                  alignItems: 'center',
                  marginBottom: 25,
                }}>
                <FontAwesome name="pencil" size={25} color={Colors.primary} />
              </View>
              <Text style={[styles.modalTitle, {marginBottom: 15}]}>
                {t('Edit your name')}
              </Text>
              <TextInput
                placeholder={'Enter your name'}
                value={Name}
                onChangeText={value => setName(value)}
                style={styles.input}
                placeholderTextColor={Colors.black3}
              />
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={{
                    width: 102,
                    height: 38,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    borderRadius: 12,
                  }}
                  onPress={() => setEditModal(false)}>
                  <Text style={styles.modalTitle}>{t('Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    width: 102,
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: Colors.primary,
                    borderRadius: 12,
                  }}
                  onPress={Edit}>
                  <Text style={[styles.modalTitle, {color: '#fff'}]}>
                    {t('Confirm')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
    // paddingHorizontal: 20,
  },
  header: {
    marginTop: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    // textAlign: isRTL ? 'right' : 'left',
  },
  title2: {
    fontSize: 18,
    fontWeight: '800',
    // marginHorizontal: isRTL ? 0 : 35,
    // marginLeft: isRTL ? 15 : undefined,
    // marginRight: isRTL ? 35 : undefined,
    // textAlign: isRTL ? 'right' : 'left',
  },
  title3: {
    fontSize: 18,
    fontWeight: '800',
    // textAlign: isRTL ? 'right' : 'left',
  },
  body: {
    marginTop: 25,
    margin: 20,
  },
  row: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 8,
  },
  text: {
    fontSize: 16,
    // marginLeft: isRTL ? 0 : 5,
    // marginRight: isRTL ? 5 : 0,
    // textAlign: isRTL ? 'right' : 'left',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: 270,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    height: 250,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: '#000',
    fontSize: 18,
    textAlign: 'center',
  },
  modalBody: {
    marginTop: 10,
    width: '100%',
  },
  langButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  langText: {
    color: '#000',
  },
  image: {
    width: 20,
    height: 20,
  },
  selectedButton: {
    backgroundColor: 'rgba(52,76,183,0.1)',
  },
  continueButton: {
    width: '100%',
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  continueText: {
    color: '#fff',
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginLeft: isRTL ? 0 : -90,
    // marginRight: isRTL ? -90 : 0,
  },
  Container: {
    alignItems: 'center',
    borderWidth: 1,
    elevation: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    position: 'absolute',
    marginTop: 250,
    alignSelf: 'center',
    height: 150,
    padding: 20,
    borderColor: Colors.border,
    borderRadius: 15,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    // textAlign: isRTL ? 'right' : 'left',
  },
});

export default Profile;
