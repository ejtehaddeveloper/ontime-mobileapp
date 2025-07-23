import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  AppState,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { useRoute } from '@react-navigation/native';
import { Colors } from '../../assets/constants';
import { SendOTP, ResendOTP, DeviceToken } from '../../context/api';
// import { verifyOTP } from '../../context/api'
import { AuthContext } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Loading from '../../assets/common/Loading';
import Ionicons from 'react-native-vector-icons/Ionicons';
import i18n from '../../assets/locales/i18';


const route = useRoute();
const phone = route.params?.phone;


const CELL_COUNT = 4;

const OTP = () => {
  const [value, setValue] = useState('');
  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const navigation = useNavigation();
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(10);
  const appState = useRef(AppState.currentState);

  // Focus on screen focus (navigation)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setTimeout(() => {
        ref.current?.focus();
      }, 400);
    });
    return unsubscribe;
  }, [navigation]);

  // Refocus on App Resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        setTimeout(() => {
          ref.current?.focus();
        }, 300);
      }
      appState.current = nextAppState;
    });
    return () => sub.remove();
  }, []);

  // Countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setInterval(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCountdown]);

const handleContinue = async () => {
  const otpCode = value;

  if (otpCode.length === 4) {
    setLoading(true);
    try {
      const response = await SendOTP(otpCode, login);
      if (response) {
        const fcmToken = await AsyncStorage.getItem('fcm_token');
        const type = Platform.OS;
        const response2 = await DeviceToken(fcmToken, type);
        if (response2) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'App' }],
          });
        }
      }
    } catch (error2) {
      Alert.alert('Error', error2.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  } else {
    Alert.alert('Error', 'Please enter a valid OTP code');
  }
};



  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name={i18n.language === 'en' ? 'arrow-back' : 'arrow-forward'}
            size={25}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          />
        </TouchableOpacity>
      <Text style={styles.heading}>Enter OTP</Text>

      <CodeField
        ref={ref}
        {...props}
        value={value}
        onChangeText={setValue}
        cellCount={CELL_COUNT}
        rootStyle={styles.codeFieldRoot}
        keyboardType="number-pad"
        textContentType="oneTimeCode"   // iOS
        autoComplete="sms-otp"          // Android
        importantForAutofill="yes"      // Android
        autoFocus={true}
        renderCell={({ index, symbol, isFocused }) => (
          <View
            key={index}
            style={[styles.cellRoot, isFocused && styles.focusCell]}
            onLayout={getCellOnLayoutHandler(index)}>
            <Text style={styles.cellText}>
              {symbol || (isFocused ? <Cursor /> : null)}
            </Text>
          </View>
        )}
      />

      {resendCountdown > 0 ? (
        <Text style={styles.resendText}>Resend in 00:{resendCountdown}s</Text>
      ) : (
       <TouchableOpacity
  onPress={async () => {
    try {
      setResendCountdown(30); // Restart timer
      const phone = await AsyncStorage.getItem('phone'); // or pass from props
      const response = await ResendOTP(phone); // assuming your API needs phone number
      console.log('Resend OTP Response:', response);
    } catch (err) {
      console.log('Resend Error:', err.message);
    }
  }}>
  <Text style={styles.resendLink}>Resend Code</Text>
</TouchableOpacity>
      )}

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        {loading ? <Loading /> : <Text style={styles.buttonText}>Confirm</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 20, marginBottom: 30 },
  codeFieldRoot: { marginTop: 20, width: '80%' },
  cellRoot: {
    width: 55,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cellText: { fontSize: 24, color: '#000' },
  focusCell: { borderColor: Colors.primary, borderWidth: 2 },
  resendText: { marginTop: 20, color: Colors.textMuted },
  resendLink: { marginTop: 20, color: Colors.primary, fontWeight: '600' },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 60,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 30,
  },
  buttonText: { color: '#fff', fontSize: 16 },
});

export default OTP;
