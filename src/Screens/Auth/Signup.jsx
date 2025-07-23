/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {
  Image,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Platform,
  SafeAreaView,
} from 'react-native';
import {Colors} from '../../assets/constants';
import {useNavigation} from '@react-navigation/native';
import {SignUp} from '../../context/api';
import Loading from '../../assets/common/Loading';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {CountryPicker} from 'react-native-country-codes-picker';

const Signup = () => {
  const logo = require('../../assets/images/logo2.png');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [errorTextname, setErrorTextname] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const navigation = useNavigation();

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false),
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleOTP = async () => {
    setErrorText('');
    setErrorTextname('');

    if (!name) {
      setErrorTextname('The name is required');
    } else if (!phone) {
      setErrorText('The phone number is required');
    } else {
      setLoading(true);
      try {
        const fullPhoneNumber = `${country.dial_code}${phone}`;
        const response = await SignUp(name, fullPhoneNumber);
        console.log('Response:', response);
        navigation.navigate('OTP', {phone});
      } catch (error) {
        console.log('Signup error', error);
        // setErrorText(error);
        if (
          error?.phone_number[0] === 'The phone number has already been taken.'
        ) {
          setErrorText(t('The phone number has already been taken'));
        } else if (
          error?.phone_number[0] ===
          'The phone number field must be at least 10 characters.'
        ) {
          setErrorText(
            t('The phone number field must be at least 10 characters.'),
          );
        }
      } finally {
        setLoading(false);
      }
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <View
          style={{
            alignItems: 'center',
            marginTop: 15,
            width: '60%',
            // paddingLeft: 25,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignSelf: 'flex-start',
          }}>
          <Ionicons
            name={i18n.language === 'en' ? 'arrow-back' : 'arrow-forward'}
            size={25}
            // color={Colors.primary}
            onPress={handleGoback}
            hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
          />
          <Text style={styles.header}>{t('Sign up')}</Text>
        </View>
        <ScrollView
          contentContainerStyle={{flexGrow: 1}}
          keyboardShouldPersistTaps="handled">
          <View style={styles.innerContainer}>
            {!keyboardVisible && (
              <View style={styles.logoContainer}>
                <Image source={logo} style={styles.image} />
              </View>
            )}
            <View>
              <Text style={styles.label}>{t('Name')}</Text>
              <TextInput
                placeholder={t('Enter your Name')}
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor={Colors.black3}
              />
              <Text style={styles.errorText}>{errorTextname}</Text>
            </View>
            <View>
              <Text style={styles.label}>{t('Phone')}</Text>
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
                <View style={{flexDirection: 'row'}}>
                  <Text style={{top: 10}}>
                    {country ? `${country.dial_code}` : '+974'}
                  </Text>
                  <View
                    style={{
                      paddingTop: 10,
                      borderRightWidth: 1,
                      marginHorizontal: 3,
                      paddingHorizontal: 3,
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
                    // style={styles.cont}
                    placeholderTextColor={Colors.black3}
                    keyboardType="phone-pad"
                  />
                </View>
                <CountryPicker
                  show={isVisible}
                  pickerButtonOnPress={handleCountrySelect}
                  style={{modal: {backgroundColor: 'white', marginTop: 200}}}
                />
              </View>
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
            {loading ? (
              <Loading />
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleOTP}>
                <Text style={styles.buttonText}>{t('Sign up')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 55,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  header: {
    fontSize: 25,
  },
  image: {
    width: 150,
    height: 250,
  },
  label: {
    color: '#000',
    fontWeight: '600',
    marginTop: 15,
  },
  input: {
    width: 336,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    color: '#000',
    paddingHorizontal: 15,
  },
  errorText: {
    color: 'red',
    marginLeft: 15,
    fontSize: 12,
  },
  button: {
    width: 336,
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
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
});

export default Signup;
