/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {useNavigation} from '@react-navigation/native';
import {deleteAppoint, getAppointByID} from '../../context/api';
import Loading from '../../assets/common/Loading';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';

const BookingDetails = ({route}) => {
  const {id} = route.params;
  console.log('id : ', id);

  console.log('BookingDetails');

  const [salon, setSalons] = useState([]);
  const [loading, setloading] = useState(true);
  const [isDeleteModal, setDeleteModal] = useState(false);

  const navigation = useNavigation();

  const handleGoBack = () => navigation.goBack();

  // const address = 'Tabarbor-Amman';

  const openMap = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      salon?.salon?.location?.address,
    )}`;
    Linking.openURL(url);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const Data = await getAppointByID(id);
        setSalons(Data);
        console.log('ddddddddddddddd', Data.service?.id);
      } catch (error) {
        console.log('Error fetching data:', error);
      } finally {
        setloading(false);
      }
    };

    fetchData();
  }, [id]);

  const cancel = async () => {
    try {
      const response = await deleteAppoint(id);
      if (response) {
        console.log(response);
        navigation.goBack();
      }
    } catch (error) {
      console.log('delete', error);
    } finally {
    }
  };

  const handlechange = (appointmentID, salonId, serviceID) => {
    console.log('vvvvvvvvvvvvvvvvv', appointmentID, salonId, serviceID);
    let isSubService;
    if (salon?.sub_service) {
      isSubService = 1;
    } else {
      isSubService = 0;
    }
    navigation.navigate('ChangeAppointment', {
      appointmentID,
      salonId,
      serviceID,
      isSubService,
    });
  };

  function formatTimeTo12Hour(time24) {
    if (!time24) {
      return '';
    }

    // Create a Date object with the time (using arbitrary date)
    const [hours, minutes] = time24.split(':');
    let hourNum = parseInt(hours, 10);

    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    hourNum = hourNum % 12;
    hourNum = hourNum === 0 ? 12 : hourNum; // Handle midnight and noon

    return `${hourNum}:${minutes} ${ampm}`;
  }
  const formatDate = dateString => {
    const date = new Date(dateString);

    const options = {weekday: 'long', day: 'numeric', month: 'short'};
    // e.g., Saturday, 17 May

    return new Intl.DateTimeFormat('en-US', options).format(date);
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons
            name={i18n.language === 'en' ? 'arrow-back' : 'arrow-forward'}
            size={25}
            onPress={handleGoBack}
          />
          <Text style={styles.headerTitle}>{t('Booking')}</Text>
          <Text style={styles.headerStatus}>{salon?.status}</Text>
        </View>
        {loading ? (
          <Loading />
        ) : (
          <ScrollView contentContainerStyle={{marginTop: 25}}>
            <Text style={styles.reviewTitle}>{t('Booking Details')}</Text>

            <View style={styles.listContainer}>
              <View style={styles.list}>
                <Text style={styles.listTitle}>{t('Date & Time')}</Text>
                <Text style={styles.date}>{formatDate(salon?.date)}</Text>
                <Text style={styles.time}>
                  {formatTimeTo12Hour(salon?.start_time)}
                </Text>
              </View>

              <View style={styles.list}>
                <Text style={styles.listTitle}>{t('Salon info')}</Text>
                <View style={{flexDirection: 'row'}}>
                  <Text style={styles.stylist}>{t('Name :')} </Text>
                  <Text style={styles.stylist}>
                    {i18n.language === 'ar'
                      ? salon?.salon?.name_ar
                      : salon?.salon?.name}
                  </Text>
                </View>
                <View style={{flexDirection: 'row'}}>
                  <Text style={styles.stylist}>{t('Phone : ')}</Text>
                  <Text style={styles.stylist}>{salon?.salon?.phone}</Text>
                </View>
                <View style={{flexDirection: 'row'}}>
                  <Text style={styles.stylist}>{t('Address : ')}</Text>
                  <Text style={styles.stylist}>
                    {salon?.salon?.location?.address}
                  </Text>
                </View>
                <TouchableOpacity style={styles.mapButton} onPress={openMap}>
                  <Ionicons name="location" size={15} color={'#fff'} />
                  <Text style={styles.title3}>{t('Google Map')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.list}>
                <Text style={styles.listTitle}>{t('Service')}</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}>
                  <Text style={styles.service}>
                    {(i18n.language === 'ar'
                      ? salon?.service?.name_ar
                      : salon?.service?.name) ||
                      (i18n.language === 'ar'
                        ? salon?.sub_service?.name_ar
                        : salon?.sub_service?.name)}
                    {`\n${t('Employee')} : `}
                    {salon?.employee?.name}
                  </Text>

                  <Text style={styles.price}>
                    {salon?.service?.price || salon?.sub_service?.price}
                  </Text>
                </View>
                <View style={styles.summary}>
                  <Text style={styles.totalText}>{t('Total')}</Text>
                  <Text style={styles.totalPrice}>
                    {salon?.service?.price || salon?.sub_service?.price}
                  </Text>
                </View>
              </View>
            </View>

            {(salon?.status === 'pending' ||
              salon?.status === 'rescheduled') && (
              <View style={{flexDirection: 'row', alignSelf: 'center'}}>
                {salon?.sub_service ? (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() =>
                      handlechange(
                        id,
                        salon?.salon?.id,
                        salon?.sub_service?.uuid,
                      )
                    }>
                    <Text style={styles.buttonText}>
                      {t('Change Appointment')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() =>
                      handlechange(id, salon?.salon?.id, salon?.service?.uuid)
                    }>
                    <Text style={styles.buttonText}>
                      {t('Change Appointment')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.button, {backgroundColor: Colors.primary}]}
                  onPress={() => setDeleteModal(true)}>
                  <Text style={[styles.buttonText, {color: '#fff'}]}>
                    {t('Cancel Appointment')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Modal
              visible={isDeleteModal}
              transparent={true}
              animationType="slide">
              <Pressable style={styles.modalContainer}>
                <Pressable style={styles.modalContent}>
                  <View
                    style={{
                      marginTop: 15,
                      alignItems: 'center',
                      marginBottom: 15,
                    }}>
                    <Ionicons
                      name="close-circle-outline"
                      size={25}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={[styles.modalTitle, {marginBottom: 15}]}>
                    {t('Are you sure you want to cancel this appointment?')}
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
                      <Text style={styles.modalTitle}>{t('Close')}</Text>
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
                      onPress={cancel}>
                      <Text style={[styles.modalTitle, {color: '#fff'}]}>
                        {t('Cancel')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    // borderRadius: 40,
    padding: 15,
    paddingHorizontal: 35,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  header: {
    flexDirection: 'row',
    // marginVertical: 20,
    // width: screenWidth * 0.5,
    justifyContent: 'space-between',
    // paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
  },
  headerStatus: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 5,
  },
  reviewTitle: {
    fontSize: 34,
    fontWeight: '500',
    color: '#000000',
    marginVertical: 20,
  },
  listContainer: {
    marginVertical: 20,
  },
  list: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 5,
  },
  date: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.72)',
  },
  time: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
  },
  stylist: {
    fontSize: 17,
    fontWeight: '300',
    color: 'rgba(27, 31, 38, 0.72)',
    marginTop: 15,
  },
  service: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(27, 31, 38, 0.72)',
  },
  price: {
    fontSize: 13,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#EFEFF4',
    marginVertical: 20,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  totalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  totalPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(27, 31, 38, 0.72)',
  },
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
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#C5AA96',
  },
  mapButton: {
    width: 113,
    height: 27,
    backgroundColor: '#000',
    borderRadius: 12,
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 65,
    marginBottom: 15,
    flexDirection: 'row',
  },
  title3: {
    fontSize: 12,
    color: '#fff',
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
    marginTop: 15,
  },
  modalTitle: {
    color: '#000',
    fontSize: 18,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
});

export default BookingDetails;
