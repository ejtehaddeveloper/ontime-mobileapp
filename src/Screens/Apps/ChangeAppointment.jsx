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
import {ChangeAppoint, getEmployee, getTime} from '../../context/api';
import Loading from '../../assets/common/Loading';
import {screenHeight, screenWidth} from '../../assets/constants/ScreenSize';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';
import moment from 'moment';

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
const ChangeAppointment = ({route}) => {
  const {appointmentID, salonId, serviceID, isSubService} = route.params;
  // let salonId = 10;
  console.log(
    `salonId: ${salonId} , serviceID:::::: ${serviceID}, isSubService: ${isSubService}`,
  );

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(
    String(new Date().getDate()).padStart(2, '0'),
  );
  const [isVisible4, setIsVisible4] = useState(false);
  const [EmpName, setEmp] = useState([]);
  const [AvTime, setTime] = useState([]);
  const [isNames, setNames] = useState(false);
  const [EmpID, setEmpID] = useState(null);
  const [loading, setLoading] = useState(true);
  const [Subloading, setsubLoading] = useState(false);
  const [num, setnum] = useState(null);
  const [errorC, setErrorC] = useState('');
  const [NameSelected, setNameSelected] = useState('anyone');

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

  const today = new Date();
  const currentRealMonth = today.getMonth() + 1; // 1-based month number
  const currentRealYear = today.getFullYear();
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

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const Data = await getEmployee(salonId, serviceID, isSubService);
        setEmp(Data);
      } catch (error) {
        console.log('Error fetching employees:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [
    currentMonth,
    currentYear,
    isSubService,
    salonId,
    selectedDay,
    serviceID,
  ]);

  const date = `${currentYear}-${currentMonth}-${selectedDay}`;

  useEffect(() => {
    if (!selectedDay) {
      return;
    }
    const fetchTimeSlots = async () => {
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
        console.log('Error fetching time slots:', error);
        if (error === 'Salon is not working on this day.') {
          setErrorT(error);
        } else {
          setErrorT(error);
        }

        // (NOBRIDGE) LOG  salonId: 10, serviceId: a47b43c6-c140-4817-a6d1-50b5cb32d38e,Date : 2025-04-28, employee_id 93, isSubService: 1
        // (NOBRIDGE) LOG  new Time:
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

  const Confirm = async () => {
    setnum('');
    setsubLoading(true);
    try {
      const Data = await ChangeAppoint(
        appointmentID,
        date,
        selectedDate,
        selectedEndDate,
        EmpID,
      );
      if (Data) {
        setIsVisible4(true);
        Pop_up(6);
        setnum(6);
      }
    } catch (error) {
      console.log(error);
      setnum(7);
      setErrorC(error);
      setIsVisible4(true);
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

      case 6:
        setPop(
          i18n.language === 'ar'
            ? 'تمت عملية الحجز بنجاح'
            : 'Booking completed successfully',
        );
        break;

      default:
        setPop('Unknown error');
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
        <ScrollView>
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
                {NameSelected ? `${NameSelected}` : 'anyone'}
              </Text>
              <Ionicons
                name={isNames ? 'chevron-up' : 'chevron-down'}
                size={25}
              />
            </TouchableOpacity>
            {isNames && (
              <View style={styles.dropdown}>
                <TouchableOpacity
                  onPress={() => [
                    setNameSelected(null),
                    setEmpID(null),
                    setNames(false),
                  ]}>
                  <Text style={styles.dropdownItemText}>anyone</Text>
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
                        ]}>
                        <Text style={styles.dropdownItemText}>{item.name}</Text>
                      </TouchableOpacity>
                    );
                  }}
                  keyExtractor={item => item.id.toString()}
                />
              </View>
            )}
          </View>

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
              {monthsToDisplay[parseInt(currentMonth, 10) - 1]}, {currentYear}
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
            style={{width: screenWidth * 0.73, alignSelf: 'center'}}
          />

          <View style={[styles.modalHeader, {marginTop: screenHeight * 0.08}]}>
            <Text style={styles.headerText}>{t('Available Times')}</Text>
          </View>
          {errorT ? (
            <Text
              style={[styles.headerText, {alignSelf: 'center', marginTop: 55}]}>
              {errorT}
            </Text>
          ) : (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  direction: 'ltr',

                  // width: screenWidth * 0.88,
                }}>
                {AvTime?.sort((a, b) =>
                  a.start_time.localeCompare(b.start_time),
                ).map(item => {
                  const formattedTime = moment(item.start_time, 'HH:mm')
                    .locale(i18n.language === 'ar' ? 'ar' : 'en')
                    .format('hh:mm a');

                  return (
                    <TouchableOpacity
                      key={item?.id?.toString() || Math.random().toString()}
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
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={Confirm}>
                    <Text style={styles.buttonText}>{t('Change')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
          {/* ask Modal */}

          <Modal
            animationType="slide"
            transparent
            visible={isVisible4}
            onRequestClose={() => setIsVisible4(false)}>
            <Pressable
              style={[styles.modal, {justifyContent: 'center'}]}
              onPress={() => setIsVisible4(false)}>
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
                    {num === 6 ? t('Success') : t('Sorry')}
                  </Text>
                  <Ionicons
                    name="close-outline"
                    size={25}
                    onPress={() => setIsVisible4(false)}
                  />
                </View>
                <Text
                  style={[
                    styles.modalTitle,
                    {alignSelf: 'center', fontSize: 13, textAlign: 'center'},
                  ]}>
                  {num === 7 ? errorC : pop}
                </Text>
                <View
                  style={[
                    styles.modalButtonContainer,
                    {justifyContent: 'center'},
                  ]}>
                  {num === 6 ? (
                    <TouchableOpacity style={styles.modalButton} onPress={Done}>
                      <Text style={styles.buttonText}>{t('Done')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => setIsVisible4(false)}>
                      <Text style={styles.buttonText}>{t('Close')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </ScrollView>
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
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonContainer: {
    // flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 10,
    alignItems: 'center',
    marginTop: 55,
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
    maxHeight: height * 0.3,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  title2: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
    color: Colors.black3,
  },
  priceText: {
    marginRight: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '95%',
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
});

export default ChangeAppointment;
