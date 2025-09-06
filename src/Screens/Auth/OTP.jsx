/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useRef, useState, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  AppState,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import {Colors} from '../../assets/constants';
import {SendOTP, ResendOTP, DeviceToken} from '../../context/api';
import {AuthContext} from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import i18n from '../../assets/locales/i18';

const CELL_COUNT = 4;

const OTP = () => {
  const [value, setValue] = useState('');
  const ref = useBlurOnFulfill({value, cellCount: CELL_COUNT});
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const navigation = useNavigation();
  const route = useRoute();
  const phone = route.params?.phone;
  const {login} = useContext(AuthContext);

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

  // Debug helper
  const logDebug = (...args) => {
    console.log('[OTP DEBUG]', ...args);
  };

  /**
   * handleContinue
   * - Accepts SendOTP's various return shapes:
   *   - boolean true
   *   - token string (e.g. "669|...")
   *   - object { success: true, token: "..."} or axios-like { data: { token: "..." } }
   * - On success: saves token (if present), registers device token, navigates to App
   * - On failure: shows server message if available, otherwise generic alert
   */
  const handleContinue = async () => {
    // basic client validation
    if (value.length !== CELL_COUNT || !/^\d+$/.test(value)) {
      return Alert.alert(
        i18n.t('Error'),
        i18n.t('Please enter a valid OTP code'),
      );
    }

    setLoading(true);

    try {
      // gather local context
      const storedPhone =
        (await AsyncStorage.getItem('phone')) || phone || null;
      const authToken =
        (await AsyncStorage.getItem('auth_token')) ||
        (await AsyncStorage.getItem('token')) ||
        null;

      logDebug('Attempting OTP verify', {
        phone: storedPhone,
        authTokenPresent: !!authToken,
      });

      // Call SendOTP wrapper (your existing API helper)
      const ok = await SendOTP(value, login);
      logDebug('SendOTP returned:', ok);

      // Normalize the result and detect token / success message
      let success = false;
      let token = null;
      let serverMsg = null;

      // 1) if wrapper returned a plain string token
      if (typeof ok === 'string' && ok.trim().length > 0) {
        success = true;
        token = ok.trim();
      }

      // 2) if wrapper returned boolean true
      else if (ok === true) {
        success = true;
      }

      // 3) if wrapper returned an object (many shapes possible)
      else if (ok && typeof ok === 'object') {
        // common shapes:
        // - { success: true, token: '...' }
        // - axios response-like: { data: { success: true, token: '...' }, status: 200 }
        // - { message: '...', success: false }
        if (ok.token) {
          success = true;
          token = ok.token;
        } else if (ok.data && ok.data.token) {
          success = true;
          token = ok.data.token;
        } else if (ok.success === true || ok.status === 200 || ok.ok === true) {
          success = true;
        }

        // server message extraction for failure reporting
        serverMsg =
          ok.message ||
          (ok.data && (ok.data.message || ok.data.error)) ||
          ok.error ||
          ok.detail ||
          null;
      }

      // If we consider this a success -> persist token (if present), register device token, navigate
      if (success) {
        try {
          if (token) {
            await AsyncStorage.setItem('auth_token', token);
            logDebug(
              'Saved auth token from SendOTP:',
              token.slice(0, 10) + '...',
            ); // masked log
          }

          // Register device token (if present)
          try {
            const fcm = await AsyncStorage.getItem('fcm_token');
            logDebug('Registering device token, fcm present:', !!fcm);
            if (fcm) {
              await DeviceToken(fcm, Platform.OS);
              logDebug('DeviceToken registration attempted');
            }
          } catch (dtErr) {
            logDebug('DeviceToken error:', dtErr);
            // not fatal — continue to navigation
          }

          // Finally, navigate into the app
          navigation.reset({index: 0, routes: [{name: 'App'}]});
          return;
        } catch (postSuccessErr) {
          logDebug(
            'Error after success (storing token / device token):',
            postSuccessErr,
          );
          Alert.alert(
            i18n.t('Error'),
            i18n.t('An unexpected error occurred. Please try again.'),
          );
          return;
        }
      }

      // If not success, show the best server message available or a generic alert
      const messageToShow = serverMsg || i18n.t('Verification failed');
      Alert.alert(i18n.t('Error'), messageToShow);
    } catch (e) {
      // Full axios-style error handling if SendOTP throws
      logDebug('Exception during SendOTP:', e);
      try {
        const status = e?.response?.status;
        const data = e?.response?.data;
        logDebug('Axios style - status:', status, 'data:', data);
        const serverMsg =
          data?.message ||
          data?.error ||
          (typeof data === 'string' ? data : null);
        const showMsg = serverMsg
          ? `${i18n.t('Verification failed')}: ${serverMsg}`
          : `${i18n.t('Verification failed')}. (${e?.message || ''})`;
        Alert.alert(i18n.t('Error'), showMsg);
      } catch (inner) {
        logDebug('Error while processing exception:', inner);
        Alert.alert(i18n.t('Error'), i18n.t('Verification failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend with logging
  const handleResend = async () => {
    setResendCountdown(30);
    try {
      const storedPhone = (await AsyncStorage.getItem('phone')) || phone;
      logDebug('ResendOTP called for phone:', storedPhone);
      const resp = await ResendOTP(storedPhone || phone);
      logDebug('ResendOTP response:', resp);
      Alert.alert(i18n.t('Success'), i18n.t('OTP resent'));
    } catch (e) {
      logDebug('ResendOTP error:', e);
      try {
        const data = e?.response?.data;
        const serverMsg =
          data?.message ||
          data?.error ||
          (typeof data === 'string' ? data : null);
        Alert.alert(
          i18n.t('Error'),
          serverMsg || i18n.t('Failed to resend OTP'),
        );
      } catch {
        Alert.alert(i18n.t('Error'), i18n.t('Failed to resend OTP'));
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}>
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
        rootStyle={[styles.codeFieldRoot, {direction: 'ltr'}]}
        textInputStyle={styles.ltrInput}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        autoFocus
        renderCell={({index, symbol, isFocused}) => (
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
        <Text style={styles.resendText}>
          {i18n.t('Resend in')} 00:{String(resendCountdown).padStart(2, '0')}s
        </Text>
      ) : (
        <TouchableOpacity onPress={handleResend}>
          <Text style={styles.resendLink}>{i18n.t('Resend Code')}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, loading ? styles.buttonDisabled : null]}
        onPress={handleContinue}
        disabled={loading}
        activeOpacity={0.8}>
        <View style={styles.buttonContent}>
          {loading && (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{marginRight: 10}}
            />
          )}
          <Text style={styles.buttonText}>
            {loading
              ? i18n.t('Confirming') || i18n.t('Confirm')
              : i18n.t('Confirm')}
          </Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  heading: {
    fontSize: 20,
    marginBottom: 30,
  },
  codeFieldRoot: {
    marginTop: 20,
    width: '80%',
    flexDirection: 'row',
  },
  ltrInput: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
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
  cellText: {
    fontSize: 24,
    color: '#000',
    writingDirection: 'ltr',
  },
  focusCell: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  resendText: {
    marginTop: 20,
    color: Colors.textMuted,
  },
  resendLink: {
    marginTop: 20,
    color: Colors.primary,
    fontWeight: '600',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 30,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.85,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default OTP;
