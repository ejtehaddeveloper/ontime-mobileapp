/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useContext, useState} from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors} from '../../assets/constants';
import {
  CommonActions,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import {AuthContext} from '../../context/AuthContext';
import {getAppoint} from '../../context/api';
import Loading from '../../assets/common/Loading';
import {useTranslation} from 'react-i18next';
import i18n from '../../assets/locales/i18';
import {screenHeight} from '../../assets/constants/ScreenSize';

const tabs = [
  {
    id: 1,
    name: 'Booked',
    name_ar: 'محجوز',
    status: ['pending', 'rescheduled'],
  },
  {
    id: 2,
    name: 'Completed',
    name_ar: 'اكتمل',
    status: ['completed'],
  },
  {
    id: 3,
    name: 'Cancelled',
    name_ar: 'ألغي',
    status: ['cancelled'],
  },
];
const Booking = () => {
  const [tabSelected, setTabSelected] = useState(1);
  const [salon, setSalons] = useState([]); // Always initialized as an array
  const [loading, setloading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const {t} = useTranslation();

  const book = salon || []; // Ensure 'book' is always an array

  const filterTab = tabs.find(item => item?.id === tabSelected);

  // Safely filter bookings when 'salon' is valid
  const filterBookings = Array.isArray(book)
    ? book.filter(item => filterTab.status.includes(item?.status))
    : [];

  const navigation = useNavigation();

  const handleBookingDetails = id => {
    navigation.navigate('BookingDetails', {id});
  };

  const {isAuth} = useContext(AuthContext);

  const fetchData = async (page = 1, reset = false) => {
    if (!hasMore && !reset) {
      return;
    }

    // setloading(true);
    try {
      const data = await getAppoint(page);
      console.log('eeeeeeeeeee', data.length);
      if (data.length > 0) {
        setSalons(data);
        setPageNumber(page);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      setloading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isAuth) {
        fetchData(1, true);
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{name: 'Auth'}],
          }),
        );
      }
    }, [isAuth, navigation, tabSelected]),
  );

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchData(pageNumber + 1);
    }
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
    <View style={styles.contaner}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('Bookings')}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.frame}>
          <View style={styles.innerFrame}>
            {tabs.map(item => (
              <TouchableOpacity
                style={
                  tabSelected === item?.id
                    ? styles.statusButton
                    : styles.statusOutlineButton
                }
                onPress={() => setTabSelected(item?.id)}>
                <Text
                  style={
                    tabSelected === item?.id
                      ? styles.statusButtonText
                      : styles.statusOutlineButtonText
                  }>
                  {i18n.language === 'ar' ? item?.name_ar : item?.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {loading ? (
            <View style={{alignItems: 'center', justifyContent: 'center'}}>
              <Loading />
            </View>
          ) : (
            <>
              <FlatList
                nestedScrollEnabled={true}
                data={filterBookings}
                renderItem={({item}) => {
                  return (
                    <TouchableOpacity
                      style={styles.card}
                      onPress={() => handleBookingDetails(item?.id)}>
                      <Image
                        style={styles.image}
                        source={{
                          uri: item?.salon?.images?.logo,
                        }}
                      />
                      <View style={styles.info}>
                        <View style={styles.infoRow}>
                          <Text style={styles.name}>
                            {i18n.language === 'ar'
                              ? item?.salon?.name_ar
                              : item?.salon?.name}
                          </Text>
                        </View>
                        {/* <View style={styles.infoRow}>
                          <Text style={styles.price}>
                            {item?.sub_service?.price} JDs
                          </Text>
                        </View> */}
                        <View style={styles.infoRow}>
                          <Text style={styles.schedule}>
                            {formatTimeTo12Hour(item?.start_time)}
                          </Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.schedule}>
                            {formatDate(item?.date)}
                          </Text>
                        </View>
                        <View style={styles.detailButton}>
                          <Text style={styles.detailButtonText}>
                            {t('Detail')}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={item => item?.id.toString()}
                style={{marginBottom: 100}}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.2}
                ListFooterComponent={
                  loading && hasMore ? <Text>Loding ....</Text> : null
                }
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contaner: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 100,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
    paddingTop: screenHeight * 0.04,
  },
  header: {
    marginTop: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    marginTop: 25,
    padding: 20,
  },
  frame: {
    flexDirection: 'column',
    gap: 24,
  },
  innerFrame: {
    borderWidth: 1,
    borderColor: Colors.primary,
    alignSelf: 'center',
    padding: 10,
    borderRadius: 20,
    height: 59,
    width: 348,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#C5AA96',
    width: 95,
    alignItems: 'center',
    marginLeft: 10,
    marginRight: 10,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins',
  },
  statusOutlineButton: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C5AA96',
    width: 95,
    alignItems: 'center',
    marginLeft: 10,
    marginRight: 10,
  },
  statusOutlineButtonText: {
    color: '#C5AA96',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Poppins',
  },
  card: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Poppins',
    color: '#000',
  },
  services: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Poppins',
    color: '#818181',
  },
  price: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins',
    color: '#818181',
  },
  schedule: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins',
    color: '#818181',
  },
  detailButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C5AA96',
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  detailButtonText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Poppins',
    color: '#C5AA96',
  },
  modalContainer: {
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
});

export default Booking;
