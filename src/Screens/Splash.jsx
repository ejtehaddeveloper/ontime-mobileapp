/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  ImageBackground,
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  Image,
  I18nManager,
} from 'react-native';
import {CommonActions, useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors} from '../assets/constants';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import i18n from '../assets/locales/i18';

const Splash = () => {
  const logo = require('../assets/images/logo.jpg');
  const navigation = useNavigation();
  const [isWatched, setIsWatched] = useState(false);
  const [isLangModal, setLangModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState(i18n.language);
  const {t} = useTranslation();

  useEffect(() => {
    const checkIsWatched = async () => {
      try {
        const watched = JSON.parse(await AsyncStorage.getItem('isWatched'));
        console.log('isWatched:', watched);
        setIsWatched(watched);
        setLangModal(!watched);
      } catch (error) {
        console.log('Error fetching isWatched:', error);
      }
    };

    checkIsWatched();

    if (isWatched) {
      const timer = setTimeout(() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{name: 'App'}],
          }),
        );
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [navigation, isWatched]);

  const handleLangSelect = lang => {
    setSelectedLang(lang);
  };

  const handleContinue = async () => {
    console.log('Selected Language:', selectedLang);
    try {
      await AsyncStorage.setItem('language', selectedLang);
      await i18n.changeLanguage(selectedLang);
      await I18nManager.forceRTL(selectedLang === 'ar');

      setLangModal(false);

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'Splash2'}],
        }),
      );
    } catch (error) {
      console.log('Error changing language:', error);
    }
  };

  const images = {
    ar: require('../assets/images/ar.png'),
    ar2: require('../assets/images/ar2.png'),
    en: require('../assets/images/en.png'),
    en2: require('../assets/images/en2.png'),
  };

  return (
    <ImageBackground source={logo} style={styles.background} resizeMode="cover">
      <Modal visible={isLangModal} transparent animationType="slide">
        <Pressable style={styles.modalContainer}>
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Choose a Language')}</Text>
              <Ionicons
                name="close-outline"
                size={25}
                onPress={() => {
                  setLangModal(false);
                  setTimeout(() => {
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [{name: 'Splash2'}],
                      }),
                    );
                  }, 500);
                }}
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
                  {backgroundColor: selectedLang ? Colors.primary : '#ccc'},
                ]}
                onPress={handleContinue}
                disabled={!selectedLang}>
                <Text style={styles.continueText}>{t('Change')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '98%',
    backgroundColor: '#fff',
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
    paddingLeft: 5,
    paddingRight: 5,
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
});

export default Splash;
