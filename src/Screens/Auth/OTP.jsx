import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  AppState,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { Colors } from '../../assets/constants';
import { SendOTP, ResendOTP, DeviceToken } from '../../context/api';
import { AuthContext } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Loading from '../../assets/common/Loading';
import Ionicons from 'react-native-vector-icons/Ionicons';
import i18n from '../../assets/locales/i18';

const CELL_COUNT = 4;

const OTP = () => {
  const [value, setValue] = useState('');
  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({ value, setValue });

  const navigation = useNavigation();
  const route = useRoute();
  const phone = route.params?.phone;
  const { login } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(10);
  const appState = useRef(AppState.currentState);

  // Focus when screen appears
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      setTimeout(() => ref.current?.focus(), 400);
    });
    return unsub;
  }, [navigation]);

  // Refocus on resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        setTimeout(() => ref.current?.focus(), 300);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setInterval(() => setResendCountdown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendCountdown]);

  const handleContinue = async () => {
    if (value.length !== CELL_COUNT) {
      return Alert.alert(i18n.t('Error'), i18n.t('Please enter a valid OTP code')); 
    }
    setLoading(true);
    try {
      const ok = await SendOTP(value, login);
      if (ok) {
        const fcm = await AsyncStorage.getItem('fcm_token');
        const resp2 = await DeviceToken(fcm, Platform.OS);
        if (resp2) {
          navigation.reset({ index: 0, routes: [{ name: 'App' }] });
        }
      }
    } catch (e) {
      Alert.alert(i18n.t('Error'), e.message || i18n.t('Failed to verify OTP'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons
          name={i18n.language === 'en' ? 'arrow-back' : 'arrow-forward'}
          size={25}
        />
      </TouchableOpacity>

      <Text style={styles.heading}>{i18n.t('Verify OTP')}</Text>

      <CodeField
        ref={ref}
        {...props}
        value={value}
        onChangeText={setValue}
        cellCount={CELL_COUNT}
        rootStyle={[styles.codeFieldRoot, { direction: 'ltr' }]}
        textInputStyle={styles.ltrInput}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        autoFocus
        renderCell={({ index, symbol, isFocused }) => (
          <View
            key={index}
            style={[styles.cellRoot, isFocused && styles.focusCell]}
            onLayout={getCellOnLayoutHandler(index)}
          >
            <Text style={styles.cellText}>
              {symbol || (isFocused ? <Cursor /> : null)}
            </Text>
          </View>
        )}
      />

      {resendCountdown > 0 ? (
        <Text style={styles.resendText}>
          {i18n.t('Resend in')} 00:{resendCountdown}s
        </Text>
      ) : (
        <TouchableOpacity
          onPress={async () => {
            setResendCountdown(30);
            try {
              const ph = await AsyncStorage.getItem('phone');
              await ResendOTP(ph || phone);
            } catch {}
          }}
        >
          <Text style={styles.resendLink}>{i18n.t('Resend Code')}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        {loading ? (
          <Loading />
        ) : (
          <Text style={styles.buttonText}>{i18n.t('Confirm')}</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backBtn: {
    position: 'absolute',
    top: 20,
    left: 20
  },
  heading: {
    fontSize: 20,
    marginBottom: 30
  },
  codeFieldRoot: {
    marginTop: 20,
    width: '80%',
    flexDirection: 'row'
  },
  ltrInput: {
    textAlign: 'left',
    writingDirection: 'ltr'
  },
  cellRoot: {
    width: 55,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginHorizontal: 5
  },
  cellText: {
    fontSize: 24,
    color: '#000',
    writingDirection: 'ltr'
  },
  focusCell: {
    borderColor: Colors.primary,
    borderWidth: 2
  },
  resendText: {
    marginTop: 20,
    color: Colors.textMuted
  },
  resendLink: {
    marginTop: 20,
    color: Colors.primary,
    fontWeight: '600'
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 60,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 30
  },
  buttonText: {
    color: '#fff',
    fontSize: 16
  }
});

export default OTP;
