/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
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

// Screen dims
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

/**
 * DateBook — improved & strict 3x4 time grid
 * - Only available slots are used
 * - In-memory caching per (emp|any) + date
 * - Pages of 12 slots (3 cols x 4 rows), horizontally scrollable
 * - Empty placeholders keep consistent layout when a page has <12 items
 * - Pills have consistent width & height computed from screen size
 */

const DateBook = ({route}) => {
  const {salonId, serviceID, isSubService} = route.params;
  const navigation = useNavigation();

  // selection / UI state
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(
    String(new Date().getDate()).padStart(2, '0'),
  );

  // employees & times
  const [employees, setEmployees] = useState([]);
  const [empModalVisible, setEmpModalVisible] = useState(false);
  const [empSelectedId, setEmpSelectedId] = useState(null);
  const [empSelectedName, setEmpSelectedName] = useState(t('anyone'));

  const [timeSlots, setTimeSlots] = useState([]); // only available slots
  const [loadTime, setLoadTime] = useState(false);
  const [errorT, setErrorT] = useState('');

  // other UI / modal states
  const [loading, setLoading] = useState(true);
  const [isVisibleCart, setIsVisibleCart] = useState(false);
  const [isVisibleMsg, setIsVisibleMsg] = useState(false);
  const [cart, setCart] = useState([]);
  const [TPrice, setTPrice] = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subLoading2, setSubLoading2] = useState(false);
  const [num, setNum] = useState(null);
  const [pop, setPop] = useState('');
  const [errorC, setErrorC] = useState(null);

  // date helpers
  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const [currentMonth, setCurrentMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, '0'),
  );
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [days, setDays] = useState([]);

  // in-memory cache for times per (emp|any) + date
  const timeCacheRef = useRef(new Map());
  // fetch token to ignore stale responses
  const fetchIdRef = useRef(0);
  // mounted ref to avoid setState after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // initialize employees
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEmployee(salonId, serviceID, isSubService);
      const list = Array.isArray(res) ? res : [];
      setEmployees(list);
      if (list.length > 0) {
        setEmpSelectedId(list[0].id);
        setEmpSelectedName(list[0].name);
      } else {
        setEmpSelectedId(null);
        setEmpSelectedName(t('anyone'));
      }
    } catch (err) {
      console.log('fetchEmployees error', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [salonId, serviceID, isSubService]);

  useEffect(() => {
    fetchEmployees(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  // compute visible days array when month/year changes
  useEffect(() => {
    const daysCount = daysInMonth(parseInt(currentMonth, 10) - 1, currentYear);
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const arr = Array.from({length: daysCount}, (_, i) => {
      const d = new Date(currentYear, parseInt(currentMonth, 10) - 1, i + 1);
      const dayName = d.toLocaleString(
        i18n.language === 'ar' ? 'ar' : 'default',
        {weekday: 'short'},
      );
      return {id: i + 1, day: String(i + 1).padStart(2, '0'), dayName};
    }).filter(day =>
      todayMonth !== parseInt(currentMonth, 10) - 1
        ? true
        : day.id >= todayDate,
    );

    setDays(arr);
  }, [currentMonth, currentYear]);

  // constants for month navigation
  const Today = new Date();
  const currentRealMonth = Today.getMonth() + 1;
  const currentRealYear = Today.getFullYear();
  const nextMonth = useCallback(() => {
    let m = parseInt(currentMonth, 10);
    if (m === 12) {
      setCurrentMonth('01');
      setCurrentYear(y => y + 1);
    } else setCurrentMonth(String(m + 1).padStart(2, '0'));
  }, [currentMonth]);
  const prevMonth = useCallback(() => {
    let m = parseInt(currentMonth, 10),
      y = currentYear;
    if (y === currentRealYear && m === currentRealMonth) return;
    if (m === 1) {
      if (y > currentRealYear) {
        setCurrentMonth('12');
        setCurrentYear(y - 1);
      }
    } else setCurrentMonth(String(m - 1).padStart(2, '0'));
  }, [currentMonth, currentYear, currentRealMonth, currentRealYear]);

  // date string YYYY-MM-DD
  const date = `${currentYear}-${currentMonth}-${selectedDay}`;

  // layout math for strict 3x4 grid
  const containerWidth = useMemo(() => Math.floor(screenWidth * 0.9), []);
  const gapH = 12; // horizontal gap between pills
  const gapV = 12; // vertical gap between pills
  const cols = 3,
    rows = 4,
    perPage = cols * rows;
  const pillWidth = useMemo(
    () => Math.floor((containerWidth - gapH * (cols + 1)) / cols),
    [containerWidth],
  );
  const pillHeight = useMemo(
    () => Math.max(52, Math.floor(pillWidth * 0.55)),
    [pillWidth],
  );
  const pageHeight = useMemo(
    () => rows * pillHeight + gapV * (rows + 1),
    [rows, pillHeight, gapV],
  );

  // fetch times (uses cache if available) — store ONLY available slots
  useEffect(() => {
    if (!selectedDay) return;
    const key = `${empSelectedId ?? 'any'}|${date}`;

    const cached = timeCacheRef.current.get(key);
    if (cached) {
      setTimeSlots(cached);
      setErrorT('');
      setLoadTime(false);
      return;
    }

    let cancelled = false;
    const myFetchId = ++fetchIdRef.current;

    const doFetch = async () => {
      setLoadTime(true);
      setErrorT('');
      try {
        const res = await getTime(
          salonId,
          serviceID,
          date,
          empSelectedId,
          isSubService,
        );
        const list = Array.isArray(res) ? res : [];
        if (cancelled || fetchIdRef.current !== myFetchId) return;

        // keep only available slots
        const avail = list.filter(s => s && s.available === true);
        timeCacheRef.current.set(key, avail);
        if (mountedRef.current) setTimeSlots(avail);
      } catch (err) {
        console.log('getTime error', err);
        if (cancelled || fetchIdRef.current !== myFetchId) return;
        if (mountedRef.current) {
          setTimeSlots([]);
          setErrorT(err?.toString?.() ?? t('Error fetching times'));
        }
      } finally {
        if (
          !cancelled &&
          fetchIdRef.current === myFetchId &&
          mountedRef.current
        )
          setLoadTime(false);
      }
    };

    doFetch();
    return () => {
      cancelled = true;
    };
  }, [empSelectedId, date, salonId, serviceID, isSubService, selectedDay]);

  // chunk into pages of perPage and pad with nulls to keep layout consistent
  const pages = useMemo(() => {
    const arr = Array.isArray(timeSlots)
      ? timeSlots
          .slice()
          .sort((a, b) => a.start_time.localeCompare(b.start_time))
      : [];
    const p = [];
    for (let i = 0; i < arr.length; i += perPage) {
      const chunk = arr.slice(i, i + perPage);
      // pad
      while (chunk.length < perPage) chunk.push(null);
      p.push(chunk);
    }
    // ensure at least one page so grid always renders
    if (p.length === 0) {
      const empty = new Array(perPage).fill(null);
      p.push(empty);
    }
    return p;
  }, [timeSlots]);

  // deleting item
  const delete_item = useCallback(async id => {
    try {
      await deleteCart(id);
      setCart(prev => {
        const updated = prev.filter(x => x.cart_item_id !== id);
        if (updated.length === 0) setIsVisibleCart(false);
        return updated;
      });
    } catch (err) {
      console.log('delete_item error', err);
    }
  }, []);

  // employee row
  const renderEmployeeRow = useCallback(
    ({item}) => {
      const initials = (item.name || '')
        .split(' ')
        .map(s => s.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase();
      const selected = empSelectedId === item.id;
      return (
        <TouchableOpacity
          style={[styles.empRow, selected && styles.empRowSelected]}
          onPress={() => {
            setEmpSelectedId(item.id);
            setEmpSelectedName(item.name);
            setEmpModalVisible(false);
          }}>
          <View
            style={[styles.empAvatar, selected && styles.empAvatarSelected]}>
            <Text style={[styles.empInitials, selected && {color: '#fff'}]}>
              {initials || 'NA'}
            </Text>
          </View>
          <View style={{flex: 1, paddingHorizontal: 10}}>
            <Text style={styles.empName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.position ? (
              <Text style={styles.empPosition} numberOfLines={1}>
                {item.position}
              </Text>
            ) : null}
          </View>
          {selected && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={Colors.primary}
            />
          )}
        </TouchableOpacity>
      );
    },
    [empSelectedId],
  );

  // times pill
  const renderTimePill = useCallback(
    (slot, index) => {
      const isSelected = slot && selectedDate === slot.start_time;
      const tm = slot
        ? moment(slot.start_time, 'HH:mm')
            .locale(i18n.language === 'ar' ? 'ar' : 'en')
            .format('hh:mm a')
        : '';
      if (!slot) {
        // placeholder
        return (
          <View
            key={`ph-${index}`}
            style={[
              styles.timePillPlaceholder,
              {
                width: pillWidth,
                height: pillHeight,
                marginHorizontal: gapH / 2,
                marginVertical: gapV / 2,
              },
            ]}
          />
        );
      }
      return (
        <TouchableOpacity
          key={String(slot.id ?? Math.random())}
          activeOpacity={0.85}
          onPress={() => {
            setSelectedDate(slot.start_time);
            setSelectedEndDate(slot.end_time);
          }}
          style={[
            styles.timePill,
            styles.timePillAvailable,
            isSelected && styles.timePillSelected,
            {
              width: pillWidth,
              height: pillHeight,
              marginHorizontal: gapH / 2,
              marginVertical: gapV / 2,
            },
          ]}>
          <Text style={[styles.timeText, isSelected && {color: '#fff'}]}>
            {tm}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedDate, pillWidth, pillHeight],
  );

  // booking / cart flows
  const handleGoToCheckout = useCallback(async () => {
    if (!selectedDate) {
      Pop_up(1);
      setIsVisibleMsg(true);
      return;
    }
    setSubLoading(true);
    try {
      const res = await Cart(
        salonId,
        serviceID,
        empSelectedId,
        date,
        selectedDate,
        selectedEndDate,
        isSubService,
      );
      if (res) {
        setIsVisibleMsg(true);
        Pop_up(9);
        setNum(9);
      }
    } catch (err) {
      const msg = String(err || '');
      if (
        msg ===
        'You have items from a different salon in your cart. Would you like to clear your cart and add this item?'
      ) {
        Pop_up(4);
        setNum(4);
        setIsVisibleMsg(true);
      } else if (
        msg.includes(
          'You already have an appointment in your cart during this time slot.',
        )
      ) {
        Pop_up(8);
        setNum(8);
        setIsVisibleMsg(true);
      } else {
        Pop_up(8);
        setNum(8);
        setIsVisibleMsg(true);
      }
    } finally {
      setSubLoading(false);
    }
  }, [
    selectedDate,
    salonId,
    serviceID,
    empSelectedId,
    date,
    selectedEndDate,
    isSubService,
  ]);

  const Confirm = useCallback(async () => {
    setSubLoading2(true);
    try {
      const resp = await appointment();
      if (resp) {
        setIsVisibleCart(false);
        Pop_up(6);
        setNum(6);
        setIsVisibleMsg(true);
      }
    } catch (err) {
      setNum(7);
      setErrorC(err);
      setIsVisibleCart(false);
      setIsVisibleMsg(true);
    } finally {
      setSubLoading2(false);
    }
  }, []);
  const Done = useCallback(() => {
    setIsVisibleMsg(false);
    navigation.dispatch(
      CommonActions.reset({index: 0, routes: [{name: 'App'}]}),
    );
  }, [navigation]);
  const handleClearCart = useCallback(async () => {
    try {
      const res = await ClearCart();
      if (res) {
        Pop_up(5);
        setNum(5);
        setIsVisibleMsg(true);
      }
    } catch (err) {
      console.log('ClearCart error', err);
    }
  }, []);
  const fetchCart = useCallback(async () => {
    try {
      const res = await getCart();
      if (res) {
        setCart(res.data || []);
        setTPrice(res);
      }
    } catch (err) {
      console.log('getCart error', err);
    }
  }, []);

  const Pop_up = useCallback(numP => {
    switch (numP) {
      case 1:
        setPop(
          i18n.language === 'ar'
            ? 'يرجى اختيار وقت مناسب'
            : 'Please select a suitable time',
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
  }, []);

  const employeeLabel = useMemo(
    () => empSelectedName || t('anyone'),
    [empSelectedName],
  );
  const monthsToDisplay = i18n.language === 'ar' ? arabicMonths : months;

  const ListHeaderComponent = useCallback(() => {
    return (
      <View>
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>{t('Select Your Date')}</Text>
        </View>

        <View style={styles.empSelectRow}>
          <TouchableOpacity
            style={styles.empSelectBtn}
            onPress={() => setEmpModalVisible(true)}>
            <Text style={styles.empSelectText}>{employeeLabel}</Text>
            <Ionicons name="chevron-down" size={20} />
          </TouchableOpacity>
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

            <Text style={styles.monthLabel}>
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
            data={days}
            renderItem={({item}) => {
              const isSelected = selectedDay === item.day;
              return (
                <TouchableOpacity
                  style={[
                    styles.dayItem,
                    {backgroundColor: isSelected ? Colors.primary : '#fff'},
                  ]}
                  onPress={() => {
                    if (selectedDay === item.day) return;
                    setSelectedDay(item.day);
                  }}>
                  <Text
                    style={[
                      styles.dayNumber,
                      {color: isSelected ? '#fff' : '#000'},
                    ]}>
                    {i18n.language === 'ar'
                      ? item.day.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])
                      : item.day}
                  </Text>
                  <Text
                    style={[
                      styles.dayName,
                      {color: isSelected ? '#fff' : '#000'},
                    ]}>
                    {item.dayName}
                  </Text>
                </TouchableOpacity>
              );
            }}
            keyExtractor={item => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingVertical: 8}}
            style={{width: screenWidth * 0.9, alignSelf: 'center'}}
          />
        </View>

        <View style={[styles.headerRow, {marginTop: 16}]}>
          <Text style={styles.headerText}>{t('Available Times')}</Text>
        </View>
      </View>
    );
  }, [
    employeeLabel,
    days,
    selectedDay,
    currentMonth,
    currentYear,
    monthsToDisplay,
  ]);

  // main screen render
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.salonInfo}>
        <Ionicons
          name={i18n.language === 'en' ? 'arrow-back' : 'arrow-forward'}
          size={25}
          onPress={() => navigation.goBack()}
        />
      </View>

      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={[]}
          ListHeaderComponent={
            <>
              {ListHeaderComponent()}

              {/* pages */}
              {errorT ? (
                <Text
                  style={[
                    styles.headerText,
                    {alignSelf: 'center', marginTop: 20},
                  ]}>
                  {errorT}
                </Text>
              ) : loadTime ? (
                <ActivityIndicator
                  size="large"
                  color={Colors.primary}
                  style={{marginTop: 20}}
                />
              ) : (
                <FlatList
                  data={pages}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(p, idx) => `page-${idx}`}
                  renderItem={({item: page}) => (
                    <View
                      style={[
                        styles.pageContainer,
                        {width: containerWidth, height: pageHeight},
                      ]}>
                      {page.map((slot, idx) => renderTimePill(slot, idx))}
                    </View>
                  )}
                  contentContainerStyle={{paddingVertical: 8}}
                />
              )}

              {/* bottom actions */}
              <View style={{paddingHorizontal: 12, marginTop: 20}}>
                <Text style={[styles.smallText, {textAlign: 'center'}]}>
                  {t('You have 10 minutes before the booking is canceled.')}
                </Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleGoToCheckout}
                    disabled={subLoading}>
                    {subLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {t('Go To Checkout')}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryBtn]}
                    onPress={() => navigation.goBack()}>
                    <Text style={[styles.primaryBtnText, {color: '#000'}]}>
                      {t('Add More')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          }
          keyExtractor={() => 'k'}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Employee selection modal */}
      <Modal
        visible={empModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmpModalVisible(false)}>
        <Pressable
          style={styles.empModalOverlay}
          onPress={() => setEmpModalVisible(false)}>
          <Pressable style={styles.empModal} onPress={e => e.stopPropagation()}>
            <View style={styles.empModalHeader}>
              <Text style={styles.empModalTitle}>{t('Choose Staff')}</Text>
              <Ionicons
                name="close-outline"
                size={20}
                onPress={() => setEmpModalVisible(false)}
              />
            </View>

            <FlatList
              data={employees}
              renderItem={renderEmployeeRow}
              keyExtractor={item => String(item.id)}
              ItemSeparatorComponent={() => <View style={{height: 8}} />}
              showsVerticalScrollIndicator={false}
              style={{maxHeight: height * 0.6}}
            />

            <TouchableOpacity
              style={styles.empModalClose}
              onPress={() => setEmpModalVisible(false)}>
              <Text style={{color: '#fff', fontWeight: '700'}}>
                {t('Close')}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* message modal */}
      <Modal
        visible={isVisibleMsg}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisibleMsg(false)}>
        <Pressable
          style={[
            styles.modal,
            {justifyContent: 'center', alignItems: 'center'},
          ]}
          onPress={() => setIsVisibleMsg(false)}>
          <Pressable
            style={[styles.modal2, {width: 300, borderRadius: 18}]}
            onPress={e => e.stopPropagation()}>
            <View style={{alignItems: 'center', marginBottom: 8}}>
              <Ionicons
                name={
                  num === 5 || num === 6 || num === 9
                    ? 'checkmark-circle'
                    : 'alert-circle'
                }
                size={36}
                color={
                  num === 5 || num === 6 || num === 9
                    ? Colors.primary
                    : '#e74c3c'
                }
              />
            </View>
            <Text style={{textAlign: 'center', marginBottom: 16}}>
              {num === 7 ? errorC : pop}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, {alignSelf: 'center', width: 140}]}
              onPress={() => (num === 6 ? Done() : setIsVisibleMsg(false))}>
              <Text style={styles.primaryBtnText}>
                {num === 6 ? t('Done') : t('Close')}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* checkout modal */}
      <Modal
        visible={isVisibleCart}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVisibleCart(false)}>
        <Pressable style={styles.modal} onPress={() => setIsVisibleCart(false)}>
          <Pressable style={styles.modal2} onPress={e => e.stopPropagation()}>
            {subLoading2 ? (
              <Loading />
            ) : (
              <>
                <View style={styles.modalHeaderContainer}>
                  <Text style={styles.modalTitle}>{t('Checkout')}</Text>
                  <Ionicons
                    name="close-outline"
                    size={25}
                    onPress={() => setIsVisibleCart(false)}
                  />
                </View>

                <FlatList
                  data={cart}
                  renderItem={({item}) => (
                    <View style={styles.serv}>
                      <View>
                        <Text style={styles.text}>
                          {i18n.language === 'ar'
                            ? item?.service?.name_ar
                            : item?.service?.name}
                        </Text>
                        <Text style={styles.title2}>
                          {item?.employee?.name
                            ?.split(' ')
                            .slice(0, 2)
                            .join(' ')}
                        </Text>
                      </View>
                      <View style={{flexDirection: 'row'}}>
                        <View>
                          <Text style={{marginRight: 15}}>
                            {String(item?.service?.price).slice(0, -3)}{' '}
                            <Text style={{fontSize: 12}}>
                              {i18n.language === 'ar' ? 'ر.ق' : 'QAR'}
                            </Text>
                          </Text>
                          <Text style={[styles.title2, {fontSize: 10}]}>
                            {item?.date.slice(5)} {t('at')} {item?.start_time}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.item3,
                            {
                              paddingLeft: 15,
                              paddingRight: 15,
                              backgroundColor: '#000',
                            },
                          ]}
                          onPress={() => delete_item(item?.cart_item_id)}>
                          <Text style={[styles.title2, {color: '#fff'}]}>
                            {t('Remove')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  keyExtractor={item => String(item.cart_item_id)}
                  style={styles.serviceList}
                />

                {cart.length > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.title2}>{t('Total')}</Text>
                    <Text style={styles.priceText}>
                      {String(TPrice?.total_price ?? '0').slice(0, -3)}{' '}
                      <Text style={{fontSize: 12}}>
                        {i18n.language === 'ar' ? 'ر.ق' : 'QAR'}
                      </Text>
                    </Text>
                  </View>
                )}

                <View style={styles.checkoutButtonsContainer}>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={Confirm}>
                    <Text style={styles.buttonText}>{t('Confirm')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // container & header
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  salonInfo: {
    flexDirection: 'row',
    padding: 15,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  // header rows
  headerRow: {paddingVertical: 8},
  headerText: {fontSize: 16, fontWeight: '600', alignSelf: 'flex-start'},
  // employee select
  empSelectRow: {marginTop: 8, marginBottom: 8, alignItems: 'center'},
  empSelectBtn: {
    width: '90%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    flexDirection: 'row',
    backgroundColor: '#fff',
    alignSelf: 'center',
  },
  empSelectText: {fontSize: 15, fontWeight: '600'},
  // month/days
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  monthLabel: {marginHorizontal: 10, fontSize: 15},
  dayItem: {
    margin: 5,
    height: 66,
    borderRadius: 12,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dayNumber: {fontSize: 18, fontWeight: '700'},
  dayName: {fontSize: 12, marginTop: 6},
  // times: page container and pills
  pageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePill: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: {width: 0, height: 3},
    shadowRadius: 6,
  },
  timePillPlaceholder: {backgroundColor: 'transparent'},
  timePillAvailable: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  timePillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeText: {fontWeight: '700'},
  // actions
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  primaryBtn: {
    width: '62%',
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {color: '#fff', fontWeight: '700'},
  secondaryBtn: {
    width: '34%',
    height: 56,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallText: {fontSize: 12, color: Colors.black3},
  // employee modal
  empModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  empModal: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: height * 0.75,
  },
  empModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  empModalTitle: {fontSize: 16, fontWeight: '700'},
  empRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  empRowSelected: {backgroundColor: 'rgba(52,76,183,0.06)'},
  empAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empAvatarSelected: {backgroundColor: Colors.primary},
  empInitials: {fontWeight: '700', color: Colors.text},
  empName: {fontWeight: '700'},
  empPosition: {fontSize: 12, color: Colors.black3},
  empModalClose: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  // message modal
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-end',
  },
  modal2: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: screenWidth * 0.9,
    marginBottom: 12,
  },
  modalTitle: {fontSize: 16, fontWeight: '600'},
  // checkout modal
  modalHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
  },
  serv: {
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  serviceList: {width: screenWidth * 0.94, marginBottom: 8},
  text: {fontSize: 14, fontWeight: '600'},
  title2: {fontSize: 12, fontWeight: '700', color: Colors.black2},
  priceText: {fontWeight: '800'},
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    padding: 10,
  },
  checkoutButtonsContainer: {alignItems: 'center'},
  confirmButton: {
    width: '90%',
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {color: '#fff', fontWeight: '700'},
  contentContainer: {paddingBottom: 30, backgroundColor: '#fff'},
});

export default DateBook;
