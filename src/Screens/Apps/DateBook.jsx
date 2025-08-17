/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import {CommonActions, useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {
  appointment,
  Cart,
  ClearCart,
  deleteCart,
  getCart,
  getEmployee,
  getTime,
} from '../../context/api';
import Loading from '../../assets/common/Loading';
import {screenHeight, screenWidth} from '../../assets/constants/ScreenSize';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';
import moment from 'moment';
import 'moment/locale/ar';

// Get screen dimensions for responsive sizing
const {width, height} = Dimensions.get('window');

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const arabicMonths = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const DateBook = ({route}) => {
  const {salonId, serviceID, isSubService} = route.params;
  console.log(
    `salonId: ${salonId} , serviceID ${serviceID}, isSubService: ${isSubService}`,
  );

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(
    String(new Date().getDate()).padStart(2, '0'),
  );
  const [isVisible2, setIsVisible2] = useState(false);
  const [isVisible4, setIsVisible4] = useState(false);
  const [EmpName, setEmp] = useState([]);
  const [AvTime, setTime] = useState([]);
  const [isNames, setNames] = useState(false);
  const [EmpID, setEmpID] = useState(null);
  const [loading, setLoading] = useState(true);
  const [Lloading, setloading] = useState(false);
  const [Subloading, setsubLoading] = useState(false);
  const [Subloading2, setsubLoading2] = useState(false);
  const [num, setnum] = useState(null);
  const [cart, setCart] = useState([]);
  const [TPrice, setTPrice] = useState([]);
  const [errorC, setErrorC] = useState();
  const [loadTime, setLoadTime] = useState(false);
  const [NameSelected, setNameSelected] = useState(t('anyone'));
  useEffect(() => {
    console.log('Cart changed:', cart);
  }, [cart]);

  const navigation = useNavigation();
  const handleGoBack = () => navigation.goBack();
  const [errorT, setErrorT] = useState('');

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();

  const [currentMonth, setCurrentMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, '0'),
  );
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [days, setDays] = useState([]);

  useEffect(() => {
    if (EmpName.length > 0) {
      setNameSelected(EmpName[0].name);
      setEmpID(EmpName[0].id);
    }
  }, [EmpName]);

  const nextMonth = () => {
    let month = parseInt(currentMonth, 10);
    if (month === 12) {
      setCurrentMonth('01');
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(String(month + 1).padStart(2, '0'));
    }
  };
  const Today = new Date();
  const currentRealMonth = Today.getMonth() + 1; // 1-based month number
  const currentRealYear = Today.getFullYear();
  const prevMonth = () => {
    let month = parseInt(currentMonth, 10);
    let year = currentYear;

    // Disable going to months before current month if same year
    if (year === currentRealYear && month === currentRealMonth) {
      // Already at current month/year, do nothing
      return;
    }

    if (month === 1) {
      if (year > currentRealYear) {
        setCurrentMonth('12');
        setCurrentYear(prev => prev - 1);
      }
      // else do nothing (can't go before current year)
    } else {
      setCurrentMonth(String(month - 1).padStart(2, '0'));
    }
  };

  useEffect(() => {
    const daysCount = daysInMonth(parseInt(currentMonth, 10) - 1, currentYear);
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const daysArray = Array.from({length: daysCount}, (_, index) => {
      const dayDate = new Date(
        currentYear,
        parseInt(currentMonth, 10) - 1,
        index + 1,
      );
      const dayName = dayDate.toLocaleString(
        i18n.language === 'ar' ? 'ar' : 'default',
        {weekday: 'short'},
      );
      return {
        id: index + 1,
        day: String(index + 1).padStart(2, '0'),
        dayName: dayName, // Store the abbreviated day name
      };
    }).filter(
      day =>
        todayMonth !== parseInt(currentMonth, 10) - 1 || day.id >= todayDate,
    );

    setDays(daysArray);
  }, [currentMonth, currentYear]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const Data = await getEmployee(salonId, serviceID, isSubService);
      setEmp(Data);
    } catch (error) {
      console.log('Error fetching employees:', error);
      setErrorT(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const date = `${currentYear}-${currentMonth}-${selectedDay}`;

  useEffect(() => {
    if (!selectedDay) {
      return;
    }
    const fetchTimeSlots = async () => {
      setLoadTime(true);
      setErrorT('');
      try {
        const Data = await getTime(
          salonId,
          serviceID,
          date,
          EmpID,
          isSubService,
        );
        setTime(Data);
        // console.log('HERE', Data);
      } catch (error) {
        console.log('Error fetching time slots 111:', error);
        // if (error === 'Salon is not working on this day.') {
        //   setErrorT(error);
        // } else {
        setErrorT(error);
        // }
      } finally {
        setLoadTime(false);
      }
    };
    fetchTimeSlots();
  }, [EmpID, date, isSubService, salonId, selectedDay, serviceID]);

  const fetchTimeSlot = async () => {
    setLoadTime(true);
    setErrorT('');
    setSelectedDate(null);
    setSelectedEndDate(null);
    try {
      const Data = await getTime(salonId, serviceID, date, EmpID, isSubService);
      setTime(Data);
      // console.log('HERE', Data);
    } catch (error) {
      console.log('Error fetching time slots 111:', error);
      // if (error === 'Salon is not working on this day.') {
      //   setErrorT(error);
      // } else {
      setErrorT(error);
      // }

      // (NOBRIDGE) LOG  salonId: 10, serviceId: a47b43c6-c140-4817-a6d1-50b5cb32d38e,Date : 2025-04-28, employee_id 93, isSubService: 1
      // (NOBRIDGE) LOG  new Time:
    } finally {
      setLoadTime(false);
    }
  };

  const renderDateItemDay = ({item}) => {
    const isSelected = selectedDay === item.day;
    return (
      <TouchableOpacity
        style={[
          styles.item2,
          {backgroundColor: isSelected ? Colors.primary : 'white'},
        ]}
        onPress={() => [setSelectedDay(item.day), fetchTimeSlot()]}>
        <Text
          style={[styles.selectDate, {color: isSelected ? 'white' : '#000'}]}>
          {i18n.language === 'ar'
            ? item.day.toString().replace(/\d/g, digit => '٠١٢٣٤٥٦٧٨٩'[digit])
            : item.day}
        </Text>
        <Text
          style={[
            styles.selectDate,
            {color: isSelected ? 'white' : '#000', fontSize: 12},
          ]}>
          {item.dayName}
        </Text>
      </TouchableOpacity>
    );
  };

  const delete_item = async id => {
    setloading(true);
    try {
      const response = await deleteCart(id);
      console.log('Delete Response:', response);
      if (response) {
        setCart(prevCart => {
          const updatedCart = prevCart.filter(item => item.cart_item_id !== id);
          if (updatedCart.length === 0) {
            setIsVisible2(false);
          }
          return updatedCart;
        });
      }
    } catch (error) {
      console.log('Cart error', error);
    } finally {
      setloading(false);
    }
  };

  const renderServiceItem = ({item}) => (
    <View style={styles.serv}>
      <View>
        <Text style={styles.text}>
          {i18n.language === 'ar'
            ? item?.service?.name_ar
            : item?.service?.name}
        </Text>
        <Text style={styles.title2}>
          {item?.employee?.name?.split(' ').slice(0, 2).join(' ')}
        </Text>
      </View>
      <View style={{flexDirection: 'row'}}>
        <View>
          <Text style={{marginRight: 15}}>
            {item?.service?.price.slice(0, -3)}{' '}
            <Text style={{fontSize: 12}}>
              {i18n.language === 'ar' ? 'ر.ق' : 'QAR'}
            </Text>
          </Text>
          <Text style={[styles.title2, {fontSize: 10}]}>
            {item?.date.slice(5, item?.date.length)} {t('at')}{' '}
            {item?.start_time}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.item3,
            {paddingLeft: 15, paddingRight: 15, backgroundColor: '#000'},
          ]}
          onPress={() => delete_item(item?.cart_item_id)}>
          <Text style={[styles.title2, {color: '#fff'}]}>{t('Remove')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleGoSalon = async () => {
    if (!selectedDate) {
      Pop_up(1);
      setIsVisible4(true);
    } else {
      setsubLoading(true);
      try {
        const Data = await Cart(
          salonId,
          serviceID,
          EmpID,
          date,
          selectedDate,
          selectedEndDate,
          isSubService,
        );
        if (Data) {
          // navigation.goBack();
          setIsVisible4(true);
          Pop_up(9);
          setnum(9);
        }
      } catch (error) {
        console.log('Error fetching data getCart:', error);
        if (
          error ===
          'You have items from a different salon in your cart. Would you like to clear your cart and add this item?'
        ) {
          setIsVisible4(true);
          Pop_up(4);
          setnum(4);
        } else if (
          error.includes(
            'You already have an appointment in your cart during this time slot.',
          )
        ) {
          setIsVisible4(true);
          Pop_up(8);
          setnum(8);
        }
      } finally {
        setsubLoading(false);
      }
    }
  };

  const Confirm = async () => {
    setsubLoading2(true);
    try {
      const response = await appointment();
      if (response) {
        setIsVisible2(false);
        Pop_up(6);
        setnum(6);
        setIsVisible4(true);
      }
    } catch (error) {
      console.log(error);
      setnum(7);
      setErrorC(error);
      setIsVisible2(false);
      setIsVisible4(true);
    } finally {
      setsubLoading2(false);
    }
  };

  const Done = () => {
    setIsVisible4(false);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'App'}],
      }),
    );
  };

  const handleClearCart = async () => {
    try {
      const Data = await ClearCart();
      if (Data) {
        Pop_up(5);
        setnum(5);
        setIsVisible4(true);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchData = async () => {
    setloading(true);
    try {
      const Data = await getCart();
      console.log('data', Data.data);

      setCart(Data.data);
      setTPrice(Data);
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      setloading(false);
    }
  };

  const Go_To_Checkout = async () => {
    if (!selectedDate) {
      Pop_up(1);
      setIsVisible4(true);
    } else {
      setsubLoading(true);
      try {
        const Data = await Cart(
          salonId,
          serviceID,
          EmpID,
          date,
          selectedDate,
          selectedEndDate,
          isSubService,
        );
        if (Data) {
          setIsVisible2(true);
          fetchData();
        }
      } catch (error) {
        console.log('Error fetching data getCart:', error);
        if (
          error ===
          'You have items from a different salon in your cart. Would you like to clear your cart and add this item?'
        ) {
          setIsVisible4(true);
          Pop_up(4);
          setnum(4);
        } else if (
          error.includes(
            'You already have an appointment in your cart during this time slot.',
          )
        ) {
          setIsVisible4(true);
          Pop_up(8);
          setnum(8);
        }
      } finally {
        setsubLoading(false);
      }
    }
  };

  const [pop, setPop] = useState('');

  const Pop_up = numP => {
    switch (numP) {
      case 1:
        setPop(
          i18n.language === 'ar'
            ? 'يرجى اختيار وقت مناسب'
            : 'Please select a suitable time',
        );
        break;

      case 3:
        setPop(
          i18n.language === 'ar'
            ? 'يرجى اختيار موظفك المفضل'
            : 'Please select your preferred staff member',
        );
        break;

      case 4:
        setPop(
          i18n.language === 'ar'
            ? 'لديك خدمة من صالون مختلف في سلتك. \n \n هل ترغب في مسح سلتك وإضافة هذه الخدمة؟'
            : 'You have service from a different salon in your cart. \n \n Would you like to clear your cart and add this service?',
        );
        break;

      case 5:
        setPop(
          i18n.language === 'ar'
            ? 'تم مسح السلة. يمكنك الآن إتمام عملية الحجز'
            : 'The cart has been cleared. You can now complete the appointment process.',
        );
        break;

      case 6:
        setPop(
          i18n.language === 'ar'
            ? 'تمت عملية الحجز بنجاح'
            : 'Booking completed successfully',
        );
        break;

      case 8:
        setPop(
          i18n.language === 'ar'
            ? 'لديك خدمة في نفس الوقت موجود في سلتك.'
            : 'You have a service already in your cart at the same time.',
        );
        break;

      case 9:
        setPop(
          i18n.language === 'ar'
            ? 'تمت عملية الإضافة الى السلة بنجاح'
            : 'The item was successfully added to the cart.',
        );
        break;

      default:
        setPop('Unknown error');
    }
  };

  const closeModal = () => {
    if (num === 6) {
      setIsVisible4(false);
      navigation.goBack();
    } else {
      setIsVisible4(false);
      fetchEmployees();
    }
  };

  const monthsToDisplay = i18n.language === 'ar' ? arabicMonths : months;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.salonInfo}>
        <Ionicons
          name={i18n.language === 'en' ? 'arrow-back' : 'arrow-forward'}
          size={25}
          onPress={handleGoBack}
        />
      </View>
      {loading ? (
        <Loading />
      ) : (
        <>
          <ScrollView>
            {EmpName.length > 0 ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.headerText}>{t('Select Your Date')}</Text>
                </View>

                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dropdownButton,
                      {borderBottomWidth: isNames ? 0 : 1},
                    ]}
                    onPress={() => setNames(!isNames)}>
                    <Text style={styles.dropdownText}>
                      {NameSelected ? `${NameSelected}` : t('anyone')}
                    </Text>
                    <Ionicons
                      name={isNames ? 'chevron-up' : 'chevron-down'}
                      size={25}
                    />
                  </TouchableOpacity>
                  {isNames && (
                    <View style={[styles.dropdown, {overflow: 'scroll'}]}>
                      <TouchableOpacity
                        onPress={() => [
                          setNameSelected(null),
                          setEmpID(null),
                          setNames(false),
                          fetchTimeSlot(),
                        ]}>
                        <Text style={styles.dropdownItemText}>
                          {t('anyone')}
                        </Text>
                      </TouchableOpacity>
                      <FlatList
                        nestedScrollEnabled={true}
                        data={EmpName}
                        renderItem={({item}) => {
                          return (
                            <TouchableOpacity
                              onPress={() => [
                                setNameSelected(item.name),
                                setEmpID(item.id),
                                setNames(false),
                                fetchTimeSlot(),
                              ]}>
                              <Text style={styles.dropdownItemText}>
                                {item.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        }}
                        keyExtractor={item => item.id.toString()}
                      />
                    </View>
                  )}
                </View>
                <View style={{direction: 'ltr'}}>
                  <View style={styles.monthSelector}>
                    {i18n.language === 'en' ? (
                      <TouchableOpacity
                        onPress={prevMonth}
                        disabled={
                          currentYear === currentRealYear &&
                          parseInt(currentMonth, 10) === currentRealMonth
                        }
                        style={{
                          opacity:
                            currentYear === currentRealYear &&
                            parseInt(currentMonth, 10) === currentRealMonth
                              ? 0.3
                              : 1,
                        }}>
                        <Ionicons name="chevron-back" size={20} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={nextMonth}>
                        <Ionicons name="chevron-forward" size={20} />
                      </TouchableOpacity>
                    )}
                    <Text>
                      {' '}
                      {monthsToDisplay[parseInt(currentMonth, 10) - 1]},{' '}
                      {currentYear}{' '}
                    </Text>
                    {i18n.language === 'en' ? (
                      <TouchableOpacity onPress={nextMonth}>
                        <Ionicons name="chevron-forward" size={20} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={prevMonth}
                        disabled={
                          currentYear === currentRealYear &&
                          parseInt(currentMonth, 10) === currentRealMonth
                        }
                        style={{
                          opacity:
                            currentYear === currentRealYear &&
                            parseInt(currentMonth, 10) === currentRealMonth
                              ? 0.3
                              : 1,
                        }}>
                        <Ionicons name="chevron-back" size={20} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <FlatList
                    nestedScrollEnabled={true}
                    data={days}
                    renderItem={renderDateItemDay}
                    keyExtractor={item => item.id.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{width: screenWidth * 0.9, alignSelf: 'center'}}
                  />
                </View>
                <View
                  style={[
                    styles.modalHeader,
                    {marginTop: screenHeight * 0.08},
                  ]}>
                  <Text style={styles.headerText}>{t('Available Times')}</Text>
                </View>
                {errorT ? (
                  <Text
                    style={[
                      styles.headerText,
                      {alignSelf: 'center', marginTop: 55},
                    ]}>
                    {errorT}
                  </Text>
                ) : loadTime ? (
                  <Loading />
                ) : (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        // width: screenWidth * 0.88,
                        direction: 'ltr',
                      }}>
                      {AvTime?.sort((a, b) =>
                        a.start_time.localeCompare(b.start_time),
                      ).map(item => {
                        const formattedTime = moment(item.start_time, 'HH:mm')
                          .locale(i18n.language === 'ar' ? 'ar' : 'en')
                          .format('hh:mm a');

                        return (
                          <TouchableOpacity
                            key={
                              item?.id?.toString() || Math.random().toString()
                            }
                            style={[
                              styles.item,
                              {
                                backgroundColor:
                                  item.available === true
                                    ? selectedDate === item.start_time
                                      ? Colors.primary
                                      : 'white'
                                    : Colors.border,
                              },
                            ]}
                            disabled={item.available === false}
                            onPress={() => {
                              if (item.available === true) {
                                setSelectedDate(item.start_time);
                                setSelectedEndDate(item.end_time);
                              }
                            }}>
                            <Text
                              style={{
                                color:
                                  item.available === true
                                    ? selectedDate === item.start_time
                                      ? 'white'
                                      : '#000'
                                    : '#000',
                              }}>
                              {formattedTime}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {Subloading ? (
                      <Loading />
                    ) : (
                      // <TouchableOpacity style={styles.button} onPress={handleAddCart}>
                      //   <Text style={styles.buttonText}>{t('Add To Cart')}</Text>
                      // </TouchableOpacity>
                      <View>
                        <Text
                          style={[
                            styles.modalTitle,
                            {
                              fontSize: 12,
                              color: Colors.black3,
                              margin: 15,
                              textAlign: 'center',
                            },
                          ]}>
                          {t(
                            'You have 10 minutes before the booking is canceled.',
                          )}
                        </Text>
                        <View style={styles.modalButtonContainer}>
                          <TouchableOpacity
                            style={styles.modalButton}
                            onPress={Go_To_Checkout}>
                            <Text style={styles.buttonText}>
                              {t('Go To Checkout')}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.modalButton,
                              {backgroundColor: '#fff', borderColor: '#000'},
                            ]}
                            onPress={handleGoSalon}>
                            <Text style={[styles.buttonText, {color: '#000'}]}>
                              {t('Add More')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </>
                )}
                <Modal
                  animationType="slide"
                  transparent
                  visible={isVisible4}
                  onRequestClose={closeModal}>
                  <Pressable
                    style={[styles.modal, {justifyContent: 'center'}]}
                    onPress={closeModal}>
                    <Pressable
                      style={[
                        styles.modal2,
                        {width: 300, borderRadius: 50, alignSelf: 'center'},
                      ]}
                      onPress={e => e.stopPropagation()}>
                      <View
                        style={[
                          styles.modalHeaderContainer,
                          {width: 180, alignSelf: 'flex-end'},
                        ]}>
                        <Text style={[styles.modalTitle, {fontSize: 18}]}>
                          {num === 5 || num === 6 || num === 9
                            ? t('Success')
                            : t('Sorry')}
                        </Text>
                        <Ionicons
                          name="close-outline"
                          size={25}
                          onPress={closeModal}
                        />
                      </View>
                      <Text
                        style={[
                          styles.modalTitle,
                          {
                            alignSelf: 'center',
                            fontSize: 13,
                            textAlign: 'center',
                          },
                        ]}>
                        {num === 7 ? errorC : pop}
                      </Text>
                      <View
                        style={[
                          styles.modalButtonContainer,
                          {justifyContent: 'center'},
                        ]}>
                        {num === 4 ? (
                          <TouchableOpacity
                            style={styles.modalButton}
                            onPress={handleClearCart}>
                            <Text style={styles.buttonText}>{t('Clear')}</Text>
                          </TouchableOpacity>
                        ) : num === 6 ? (
                          <TouchableOpacity
                            style={styles.modalButton}
                            onPress={Done}>
                            <Text style={styles.buttonText}>{t('Done')}</Text>
                          </TouchableOpacity>
                        ) : num === 9 ? (
                          <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => [
                              setIsVisible4(false),
                              navigation.goBack(),
                            ]}>
                            <Text style={styles.buttonText}>{t('Done')}</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.modalButton}
                            onPress={closeModal}>
                            <Text style={styles.buttonText}>{t('Close')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </Pressable>
                  </Pressable>
                </Modal>
                <Modal
                  animationType="slide"
                  transparent
                  visible={isVisible2}
                  onRequestClose={() => navigation.goBack()}>
                  <Pressable
                    style={styles.modal}
                    onPress={() => navigation.goBack()}>
                    <Pressable
                      style={styles.modal2}
                      onPress={e => e.stopPropagation()}>
                      {Lloading ? (
                        <Loading />
                      ) : (
                        <>
                          <View style={styles.modalHeaderContainer}>
                            <Text style={styles.modalTitle}>
                              {t('Checkout')}
                            </Text>
                            <Ionicons
                              name="close-outline"
                              size={25}
                              onPress={() => navigation.goBack()}
                            />
                          </View>
                          <FlatList
                            nestedScrollEnabled={true}
                            data={cart}
                            renderItem={renderServiceItem}
                            keyExtractor={item => item.cart_item_id.toString()}
                            style={styles.serviceList}
                          />
                          {/* <View style={styles.totalRow}>
                      <Text style={styles.title2}>Service fees :</Text>
                      <Text style={styles.priceText}>2 JDs</Text>
                    </View> */}
                          {cart.length > 0 && (
                            <View style={styles.totalRow}>
                              <Text style={styles.title2}>{t('Total')}</Text>
                              <Text style={styles.priceText}>
                                {TPrice?.total_price.slice(0, -3)}{' '}
                                <Text style={{fontSize: 12}}>
                                  {i18n.language === 'ar' ? 'ر.ق' : 'QAR'}
                                </Text>
                              </Text>
                            </View>
                          )}
                          {/* <View style={styles.paymentMethodsContainer}>
                  <View style={styles.choose}>
                    <Ionicons name="wallet-outline" size={25} />
                    <View style={{flexDirection: 'row'}}>
                      <Text style={[styles.title2, {marginRight: 15}]}>
                        Pay Cash
                      </Text>
                      <Ionicons
                        name="ellipse-outline"
                        size={15}
                        color={Colors.black3}
                      />
                    </View>
                  </View>
                  <View style={styles.choose}>
                    <Image source={require('../../assets/images/visa_1.png')} />
                    <View style={{flexDirection: 'row'}}>
                      <Text style={[styles.title2, {marginRight: 15}]}>
                        Pay By Visa
                      </Text>
                      <Ionicons
                        name="ellipse"
                        size={15}
                        color={Colors.black3}
                      />
                    </View>
                  </View>
                </View> */}
                          <View style={styles.checkoutButtonsContainer}>
                            {/* <TouchableOpacity
                    style={[
                      styles.modalButton,
                      {backgroundColor: '#fff', borderColor: '#000'},
                    ]}>
                    <Text style={[styles.buttonText, {color: '#000'}]}>
                      Add More
                    </Text>
                           </TouchableOpacity> */}
                            {Subloading2 ? (
                              <Loading />
                            ) : (
                              <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={Confirm}>
                                <Text style={styles.buttonText}>
                                  {t('Confirm')}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </>
                      )}
                    </Pressable>
                  </Pressable>
                </Modal>
              </>
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={[styles.text, {alignSelf: 'center'}]}>
                  {t('There is no Available Employee')}
                </Text>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  salonInfo: {
    flexDirection: 'row',
    padding: 15,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  modalHeader: {
    padding: 10,
    paddingHorizontal: 40,
    marginBottom: 15,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    // alignSelf: 'center',
    alignSelf: 'flex-start',
  },
  dropdownContainer: {
    marginBottom: 15,
    zIndex: 10,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
    width: screenWidth * 0.76,
    alignSelf: 'center',
  },
  dropdownButton: {
    width: '90%',
    height: 38,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    alignSelf: 'center',
    padding: 5,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  dropdownText: {
    marginLeft: 5,
  },
  dropdown: {
    width: '90%',
    borderWidth: 1,
    elevation: 10,
    backgroundColor: '#fff',
    alignSelf: 'center',
    borderTopWidth: 0,
    padding: 10,
    position: 'absolute',
    // zIndex: 10,
    marginTop: 53,
    // maxHeight: 200,
    overflow: 'scroll',
  },
  dropdownItemText: {
    paddingVertical: 8,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    marginTop: screenHeight * 0.08,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  monthText: {
    marginHorizontal: 10,
    fontSize: 16,
  },
  daysContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingHorizontal: width * 0.05,
  },
  timesList: {
    alignItems: 'center',
    padding: 5,
  },
  item: {
    flexDirection: 'row',
    margin: 5,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '25%',
  },
  item3: {
    flexDirection: 'row',
    margin: 5,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item2: {
    margin: 5,
    height: 66,
    // borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 15,
    alignItems: 'center',
    width: 51,
    justifyContent: 'space-between',
  },
  itemText: {
    marginHorizontal: 5,
    fontSize: 16,
  },
  button: {
    width: '80%',
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    // marginBottom: screenHeight * 0.02,
    marginVertical: screenHeight * 0.08,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-end',
  },
  modal2: {
    width: '100%',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    backgroundColor: '#fff',
    padding: 15,
    maxHeight: height * 0.8,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  modalHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginBottom: 15,
    width: screenWidth * 0.9,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  modalButton: {
    width: '48%',
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  serv: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  serviceList: {
    // maxHeight: height * 0.3,
    width: screenWidth * 0.94,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  title2: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
    color: Colors.black2,
  },
  priceText: {
    paddingRight: 15,
    fontWeight: 800,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    padding: 10,
    alignSelf: 'center',
  },
  paymentMethodsContainer: {
    marginTop: 10,
    width: '100%',
  },
  choose: {
    width: '90%',
    height: 59,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 15,
  },
  checkoutButtonsContainer: {
    alignItems: 'center',
  },
  confirmButton: {
    width: '90%',
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  selectDate: {
    fontSize: 19,
  },
});

export default DateBook;
