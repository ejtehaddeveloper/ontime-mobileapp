/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import {
  Image,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {Colors} from '../../assets/constants';
import {useNavigation} from '@react-navigation/native';
import {Loginuser} from '../../context/api';
import Loading from '../../assets/common/Loading';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {CountryPicker} from 'react-native-country-codes-picker';

const Login = () => {
  const logo = require('../../assets/images/logo2.png');

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const navigation = useNavigation();

  const handleGuest = async () => {
    setErrorText('');
    if (!phone) {
      setErrorText(t('The phone number is required'));
    }
    setLoading(true);
    try {
      const fullPhoneNumber = `${country.dial_code}${phone}`;
      const response = await Loginuser(fullPhoneNumber);
      if (response) {
        navigation.navigate('OTP', {phone});
      }
    } catch (error) {
      console.log('signup error', error);
      if (error?.phone_number[0].includes('User not found.')) {
        setErrorText(t('This user is not found'));
      } else if (
        error?.phone_number[0].includes('The selected phone number is invalid.')
      ) {
        setErrorText(t('This user is not found'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoback = () => {
    navigation.goBack();
  };

  const [isVisible, setIsVisible] = useState(false);

  // Set default country to Qatar (+974)
  const [country, setCountry] = useState({
    name: 'Qatar',
    dial_code: '+974',
    code: 'QA',
  });

  const handleCountrySelect = countries => {
    setCountry(countries);
    setIsVisible(false);
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={styles.contaner}>
        <View
          style={{
            alignItems: 'center',
            marginTop: 15,
            width: '60%',
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
          <Text style={styles.header}>{t('Login')}</Text>
        </View>
        <ScrollView
          contentContainerStyle={{justifyContent: 'center', marginTop: 20}}>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 30,
            }}>
            <Image source={logo} style={styles.image} />
          </View>

          <View>
            <Text style={styles.continueText}>{t('Phone')}</Text>

            <View
              style={[
                styles.cont,
                {
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  padding: 5,
                  direction: 'ltr',
                },
              ]}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text>{country ? `${country.dial_code}` : '+974'}</Text>

                <View
                  style={{
                    borderRightWidth: 1,
                    marginHorizontal: 5,
                    paddingHorizontal: 5,
                  }}>
                  <Ionicons
                    name="chevron-down-outline"
                    size={20}
                    onPress={() => setIsVisible(true)}
                  />
                </View>

                <TextInput
                  placeholder={t('Enter your Phone')}
                  value={phone}
                  onChangeText={value => setPhone(value)}
                  placeholderTextColor={Colors.black3}
                  keyboardType="phone-pad"
                  style={{flex: 1}}
                />
              </View>
              6
              <CountryPicker
                show={isVisible}
                pickerButtonOnPress={handleCountrySelect}
                style={{modal: {backgroundColor: 'white', marginTop: 200}}}
              />
            </View>
            <Text style={{color: 'red', marginLeft: 15, fontSize: 12}}>
              {errorText}
            </Text>
          </View>
          {loading ? (
            <Loading />
          ) : (
            <TouchableOpacity style={styles.cont2} onPress={handleGuest}>
              <Text style={styles.continueText2}>{t('Login')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contaner: {
    backgroundColor: '#fff',
    flex: 1,
    alignItems: 'center',
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
    padding: 20,
  },
  cont: {
    width: 336,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    color: '#000',
    paddingLeft: 15,
  },
  cont2: {
    width: 336,
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
  },
  continueText: {
    color: '#000',
    fontWeight: '600',
  },
  continueText2: {
    color: '#fff',
    fontWeight: '600',
  },
  image: {
    width: 150,
    height: 250,
  },
  title: {
    fontSize: 8,
    fontWeight: '400',
  },
  title2: {
    fontSize: 35,
    marginTop: -15,
    color: Colors.primary,
    fontFamily: 'Allura-Regular',
  },
  header: {
    fontSize: 25,
  },
});

export default Login;
