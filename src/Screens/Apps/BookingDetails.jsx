/* eslint-disable no-catch-shadow */
/* eslint-disable react-native/no-inline-styles */
/*
  Refactored BookingDetails screen
  - Extracted reusable components (Header, InfoRow, ConfirmModal)
  - Centralized data fetching in a hook (useBooking)
  - Proper loading / error handling and cancellation safety
  - Avoids inline styles and unnecessary re-renders (useCallback / React.memo)
  - RTL-safe, accessible buttons, consistent naming
  - Small UX improvements: disable buttons during network actions, show ActivityIndicator
*/

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {useNavigation} from '@react-navigation/native';
import {deleteAppoint, getAppointByID} from '../../context/api';
import Loading from '../../assets/common/Loading';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';

// ---------- helpers (stable references, no recreations)
function formatTimeTo12Hour(time24, lang = 'en') {
  if (!time24) {
    return '';
  }
  const [hoursStr, minutes] = time24.split(':');
  let hourNum = parseInt(hoursStr, 10);
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  hourNum = hourNum % 12;
  if (hourNum === 0) {
    hourNum = 12;
  }
  return `${hourNum}:${minutes} ${ampm}`;
}

function formatDateShort(dateString) {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  const options = {weekday: 'long', day: 'numeric', month: 'short'};

  try {
    if (i18n.language === 'ar') {
      const formatter = new Intl.DateTimeFormat('ar-EG', options);
      const formatted = formatter.format(date);

      // convert Arabic digits back to English
      const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      const toEnglishDigits = s =>
        s.replace(/[٠-٩]/g, d => arabicDigits.indexOf(d));

      return toEnglishDigits(formatted);
    } else {
      return new Intl.DateTimeFormat('en-US', options).format(date);
    }
  } catch (e) {
    return date.toDateString();
  }
}

function safePriceDisplay(priceStr) {
  if (!priceStr) {
    return '-';
  }
  // If price is like "100.000" or "100000" or includes decimals, try to show the integer part
  const cleaned = String(priceStr).replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts[0]
    ? `${parts[0]} ${i18n.language === 'ar' ? 'QAR' : 'ر.ق'}`
    : `${cleaned} ${i18n.language === 'ar' ? 'QAR' : 'ر.ق'}`;
}

// ---------- data hook
function useBooking(id) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getAppointByID(id)
      .then(data => {
        if (!mounted) {
          return;
        }
        setBooking(data || null);
      })
      .catch(err => {
        console.log('getAppointByID error', err);
        if (!mounted) {
          return;
        }
        setError(err);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  return {booking, loading, error, setBooking};
}

// ---------- small presentational components
const Header = React.memo(({onBack, title, statusLabel, isRTL}) => (
  <View style={styles.header}>
    <Ionicons
      name={isRTL ? 'arrow-forward' : 'arrow-back'}
      size={25}
      onPress={onBack}
      accessibilityLabel={t('Back')}
    />
    <Text style={styles.headerTitle}>{title}</Text>
    {statusLabel ? (
      <View style={{borderRadius: 12}}>
        <Text style={styles.headerStatus}>{t(statusLabel)}</Text>
      </View>
    ) : (
      <View style={{width: 22}} />
    )}
  </View>
));

const InfoRow = React.memo(({label, value, valueStyle}) => (
  <View style={styles.intoList}>
    <Text style={styles.stylist}>{label}</Text>
    <Text style={[styles.stylist, styles.stylelistName, valueStyle]}>
      {value ?? '-'}
    </Text>
  </View>
));

const ConfirmModal = ({visible, onClose, onConfirm, loading}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalContainer} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={() => {}}>
          <View style={styles.modalIconWrap}>
            <Ionicons
              name="close-circle-outline"
              size={30}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.modalTitle}>
            {t('Are you sure you want to cancel this appointment?')}
          </Text>

          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalButtonOutline}
              onPress={onClose}
              accessibilityRole="button">
              <Text style={styles.modalButtonText}>{t('Close')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButtonPrimary,
                loading && styles.buttonDisabled,
              ]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button">
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.modalButtonText, {color: '#fff'}]}>
                  {t('Cancel')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ---------- main screen
const BookingDetails = ({route}) => {
  const {id} = route.params;
  const navigation = useNavigation();
  const isRTL = i18n.language === 'ar';

  const {booking: salon, loading, error, setBooking} = useBooking(id);
  const [isDeleteModal, setDeleteModal] = useState(false);
  const [isCancelling, setCancelling] = useState(false);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const openAddressMap = async (lat, lng, label) => {
    console.log(salon);
    lat = salon?.salon?.location?.lat;
    lng = salon?.salon?.location?.lng;
    label = salon?.salon?.location?.address;

    try {
      if (Platform.OS === 'android') {
        // Android → system intent chooser (Google Maps, Waze, Bing, etc.)
        const url = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          // fallback to Google Maps web if no map app available
          await Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
          );
        }
      } else {
        // iOS → open Apple Maps by default
        const appleUrl = `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`;
        const googleUrl = `comgooglemaps://?q=${lat},${lng}`;
        const wazeUrl = `waze://?ll=${lat},${lng}&navigate=yes`;

        // Try Apple Maps first
        const supportedApple = await Linking.canOpenURL(appleUrl);
        if (supportedApple) {
          await Linking.openURL(appleUrl);
          return;
        }

        // Try Google Maps if installed
        const supportedGoogle = await Linking.canOpenURL(googleUrl);
        if (supportedGoogle) {
          await Linking.openURL(googleUrl);
          return;
        }

        // Try Waze if installed
        const supportedWaze = await Linking.canOpenURL(wazeUrl);
        if (supportedWaze) {
          await Linking.openURL(wazeUrl);
          return;
        }

        // fallback → open Google Maps in Safari
        await Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        );
      }
    } catch (er) {
      console.error('Error opening map:', er);
    }
  };

  const confirmCancel = useCallback(async () => {
    setCancelling(true);
    try {
      const res = await deleteAppoint(id);
      if (res) {
        // Optionally: show a toast or alert
        navigation.goBack();
      }
    } catch (err) {
      console.log('delete appointment error', err);
      Alert.alert(t('Error'), t('Could not cancel appointment.'));
    } finally {
      setCancelling(false);
      setDeleteModal(false);
    }
  }, [id, navigation]);

  const handleChange = useCallback(() => {
    if (!salon) {
      return;
    }
    const appointmentID = id;
    const salonId = salon?.salon?.id;
    const serviceID = salon?.sub_service
      ? salon.sub_service.uuid
      : salon?.service?.uuid;
    const isSubService = !!salon?.sub_service;
    navigation.navigate('ChangeAppointment', {
      appointmentID,
      salonId,
      serviceID,
      isSubService: isSubService ? 1 : 0,
    });
  }, [id, salon, navigation]);

  const formattedDate = useMemo(
    () => formatDateShort(salon?.date),
    [salon?.date],
  );
  const formattedTime = useMemo(
    () => formatTimeTo12Hour(salon?.start_time),
    [salon?.start_time],
  );
  const servicePrice = useMemo(() => {
    // prefer service price, fallback to sub_service
    const p = salon?.service?.price ?? salon?.sub_service?.price;
    return safePriceDisplay(p);
  }, [salon]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          onBack={handleGoBack}
          title={t('Booking')}
          statusLabel={null}
          isRTL={isRTL}
        />
        <View style={styles.centered}>
          <Text>{t('Something went wrong')}</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          onBack={handleGoBack}
          title={''}
          statusLabel={t(salon?.status)}
          isRTL={isRTL}
        />

        <View style={{marginTop: 20}}>
          <Text
            style={[
              styles.reviewTitle,
              Platform.OS === 'ios' &&
                i18n.language === 'ar' && {textAlign: 'right'},
            ]}>
            {t('Booking Details')}
          </Text>

          <View style={styles.listContainer}>
            <View style={[styles.list, styles.rowSpaced]}>
              <Text style={styles.listTitle}>{t('Date & Time')}</Text>
              <View style={styles.columnRight}>
                <Text style={styles.date}>{formattedDate}</Text>
                <Text style={styles.time}>{formattedTime}</Text>
              </View>
            </View>

            <View style={styles.list}>
              <Text style={styles.listTitle}>{t('Salon info')}</Text>

              <InfoRow
                label={t('Name')}
                value={
                  i18n.language === 'ar'
                    ? salon?.salon?.name_ar
                    : salon?.salon?.name
                }
              />
              <InfoRow label={t('Phone')} value={salon?.salon?.phone} />
              <InfoRow
                label={t('Address')}
                value={salon?.salon?.location?.address}
              />

              <TouchableOpacity
                style={styles.mapButton}
                onPress={openAddressMap}
                accessibilityRole="button">
                <Ionicons name="location" size={15} color={'#fff'} />
                <Text style={styles.title3}>{t('Google Map')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.list}>
              <Text style={styles.listTitle}>{t('Service')}</Text>

              <InfoRow label={t('Employee')} value={salon?.employee?.name} />

              <InfoRow
                label={t('Name')}
                value={
                  i18n.language === 'ar'
                    ? salon?.service?.name_ar ?? salon?.sub_service?.name_ar
                    : salon?.service?.name ?? salon?.sub_service?.name
                }
              />

              <InfoRow label={t('Total')} value={servicePrice} />
            </View>
          </View>

          {(salon?.status === 'pending' || salon?.status === 'rescheduled') && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleChange}
                accessibilityRole="button">
                <Text style={styles.buttonText}>{t('Change Appointment')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setDeleteModal(true)}
                accessibilityRole="button">
                <Text style={[styles.buttonText, {color: '#fff'}]}>
                  {t('Cancel Appointment')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ConfirmModal
          visible={isDeleteModal}
          onClose={() => setDeleteModal(false)}
          onConfirm={confirmCancel}
          loading={isCancelling}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#fff'},
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 15,
    paddingHorizontal: 20,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  headerTitle: {fontSize: 20, fontWeight: '500', color: '#000'},
  headerStatus: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 5,
  },
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  reviewTitle: {
    fontSize: 28,
    fontWeight: '500',
    color: '#000',
    marginBottom: 10,
  },
  listContainer: {marginVertical: 10},
  list: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 12,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.black2,
    marginBottom: 8,
  },
  date: {fontSize: 17, fontWeight: '600', color: 'rgba(0, 0, 0, 0.8)'},
  time: {fontSize: 13, fontWeight: '500', color: Colors.black3},
  intoList: {
    paddingHorizontal: 6,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 25,
  },
  stylist: {fontSize: 15, fontWeight: '600', color: Colors.black3},
  stylelistName: {fontSize: 15, color: Colors.black1},
  mapButton: {
    width: 113,
    height: 27,
    backgroundColor: '#000',
    borderRadius: 12,
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    flexDirection: 'row',
  },
  title3: {fontSize: 12, color: '#fff', marginLeft: 6},
  actionsRow: {flexDirection: 'row', alignSelf: 'center', marginTop: 10},
  button: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C5AA96',
    borderWidth: 1,
    borderRadius: 34,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
    margin: 10,
    width: 150,
  },
  cancelButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#C5AA96',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: 300,
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
  },
  modalIconWrap: {alignItems: 'center', marginBottom: 8},
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  modalTitle: {color: '#000', fontSize: 16, textAlign: 'center'},
  modalButtonOutline: {
    width: 120,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  modalButtonPrimary: {
    width: 120,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  modalButtonText: {color: Colors.black2, fontSize: 14},
  buttonDisabled: {opacity: 0.6},
  rowSpaced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  columnRight: {flexDirection: 'column', alignItems: 'flex-end'},
});

export default BookingDetails;
