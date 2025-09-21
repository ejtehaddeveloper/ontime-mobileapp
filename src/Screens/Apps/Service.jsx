/* eslint-disable react-native/no-inline-styles */
import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  memo,
} from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
  Image,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {AuthContext} from '../../context/AuthContext';
import {
  getSalons,
  getServices,
  getSubCategory,
  getSubServices,
} from '../../context/api';
import i18n from '../../assets/locales/i18';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import hostImge from '../../context/hostImge';

//
// Module-level caches to avoid duplicate requests across mounts
//
const subServicesCache = new Map(); // uuid -> payload { data, min_price, max_price, min_duration, max_duration }
const subServicesPromises = new Map(); // uuid -> Promise resolving to payload
const servicesCache = new Map(); // uid -> services array

//
// ServiceItem: moved OUTSIDE parent component to avoid unstable nested component eslint error
//
const ServiceItem = memo(function ServiceItem({
  item,
  isRTL,
  t,
  DateBook,
  handleServiceLocal,
}) {
  const isSub = !!item?.has_sub_services;
  const [subInfo, setSubInfo] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!isSub) {
      return () => (mountedRef.current = false);
    }

    const uid = item.uuid;

    // cached
    if (subServicesCache.has(uid)) {
      if (mountedRef.current) {
        setSubInfo(subServicesCache.get(uid));
      }
      return () => (mountedRef.current = false);
    }

    // in-flight
    if (subServicesPromises.has(uid)) {
      subServicesPromises
        .get(uid)
        .then(res => {
          if (mountedRef.current) {
            setSubInfo(res);
          }
        })
        .catch(() => {});
      return () => (mountedRef.current = false);
    }

    // start fetch
    const promise = (async () => {
      try {
        const data = await getSubServices(uid);
        const prices = (data || [])
          .map(s => {
            const priceNum = parseFloat(s.price);
            return Number.isFinite(priceNum) ? priceNum : null;
          })
          .filter(pv => pv != null);

        const durations = (data || [])
          .map(s => {
            const d = parseInt(s.duration, 10);
            return Number.isFinite(d) ? d : null;
          })
          .filter(dv => dv != null);

        const payload = {
          data: data || [],
          min_price: prices.length ? Math.min(...prices) : null,
          max_price: prices.length ? Math.max(...prices) : null,
          min_duration: durations.length ? Math.min(...durations) : null,
          max_duration: durations.length ? Math.max(...durations) : null,
        };

        subServicesCache.set(uid, payload);
        return payload;
      } finally {
        subServicesPromises.delete(uid);
      }
    })();

    subServicesPromises.set(uid, promise);

    promise
      .then(res => {
        if (mountedRef.current) {
          setSubInfo(res);
        }
      })
      .catch(() => {});

    return () => {
      mountedRef.current = false;
    };
  }, [item, isSub]);

  const singlePrice = item?.price;
  const minPrice = subInfo?.min_price ?? null;
  const maxPrice = subInfo?.max_price ?? null;
  const minDuration = subInfo?.min_duration ?? null;
  const maxDuration = subInfo?.max_duration ?? null;

  return (
    <TouchableOpacity
      style={styles.serv}
      onPress={() =>
        isSub ? handleServiceLocal(item.uuid) : DateBook(item.uuid)
      }
      activeOpacity={0.8}>
      <View style={styles.serviceInfoContainer}>
        <View style={styles.serviceTitleRow}>
          <Text
            style={[styles.text, {textAlign: isRTL ? 'right' : 'left'}]}
            numberOfLines={1}>
            {isRTL ? item?.name_ar : item?.name}
          </Text>
        </View>

        <View style={styles.serviceMetaRow}>
          <Text style={styles.title2}>
            {isSub
              ? minDuration != null && maxDuration != null
                ? `${minDuration} - ${maxDuration} ${t('Mins')}`
                : t('Mins')
              : `${item?.duration ?? '-'} ${t('Mins')}`}
          </Text>
        </View>
      </View>

      <View style={styles.serviceActionContainer}>
        {!isSub ? (
          <Text style={styles.priceText}>
            {singlePrice ?? '-'}{' '}
            <Text style={{fontSize: 12}}>
              {i18n.language !== 'ar' ? 'QAR' : 'ر.ق'}
            </Text>
          </Text>
        ) : (
          <Text style={styles.priceText}>
            {minPrice != null && maxPrice != null
              ? `${minPrice} - ${maxPrice} ${
                  i18n.language !== 'ar' ? 'QAR' : 'ر.ق'
                }`
              : ''}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.selectButton, isSub ? styles.detailsButton : null]}
          onPress={() =>
            isSub ? handleServiceLocal(item.uuid) : DateBook(item.uuid)
          }>
          <Text style={styles.selectButtonText}>
            {t(isSub ? 'Details' : 'Select')}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const Service = ({route}) => {
  const {t} = useTranslation();
  const {salonId, uuid, CatName} = route.params;
  const {isAuth} = useContext(AuthContext);
  const navigation = useNavigation();
  const isRTL = i18n.language === 'ar';

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [salonInfo, setSalons] = useState([]); // services list
  const [subCat, setSubCat] = useState([]);
  const [subService, setSubService] = useState([]);
  const [SalonInfo, setSalonInfo] = useState({});
  const [loading, setloading] = useState(true); // initial full-page loading
  const [servicesLoading, setServicesLoading] = useState(false); // inline loading for switching subs
  const [isVisible, setIsVisible] = useState(false);
  const [Error, setError] = useState('');
  const appLogo = require('../../assets/images/logoem.png');

  const fetchingRef = useRef(null);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  // fetch services (getServices) - wrapped and guarded
  const fetchData = useCallback(
    async uid => {
      if (!uid) {
        return;
      }
      // prevent duplicate fetches for same uid
      if (fetchingRef.current === uid) {
        return;
      }
      fetchingRef.current = uid;

      // if we have the services cached for this uid, use it and avoid loader
      if (servicesCache.has(uid)) {
        setSalons(servicesCache.get(uid) || []);
        fetchingRef.current = null;
        setServicesLoading(false);
        return;
      }

      setServicesLoading(true);
      try {
        const data = await getServices(salonId, uid);
        setSalons(data || []);
        servicesCache.set(uid, data || []);
      } catch (error) {
        console.log('Error fetching services:', error);
      } finally {
        fetchingRef.current = null;
        setServicesLoading(false);
      }
    },
    [salonId],
  );

  useEffect(() => {
    // fetch both salon info and subcategories, then stop initial loading.
    const init = async () => {
      try {
        const salonPromise = (async () => {
          try {
            const data = await getSalons(salonId);
            setSalonInfo(data || {});
          } catch (e) {
            console.log('Error fetching salon data:', e);
          }
        })();

        const subCatPromise = (async () => {
          try {
            const data = await getSubCategory(uuid, salonId);
            setSubCat(data || []);
            if (data && data.length > 0) {
              setSelectedLocation(data[0].uuid);
              // use fetchData to load services for the initial category
              await fetchData(data[0].uuid);
            } else {
              setError(t('There is no services right now'));
            }
          } catch (e) {
            console.log('Error fetching sub categories:', e);
            setError(t('There is no services right now'));
          }
        })();

        await Promise.all([salonPromise, subCatPromise]);
      } finally {
        setloading(false); // initial load done
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth, salonId, uuid, fetchData]);

  const DateBook = useCallback(
    serviceID => {
      if (!isAuth) {
        navigation.navigate('Auth');
        setIsVisible(false);
      } else {
        navigation.navigate('DateBook', {salonId, serviceID, isSubService: 0});
        setIsVisible(false);
      }
    },
    [isAuth, navigation, salonId],
  );

  const DateBook2 = useCallback(
    serviceID => {
      if (!isAuth) {
        navigation.navigate('Auth');
        setIsVisible(false);
      } else {
        navigation.navigate('DateBook', {salonId, serviceID, isSubService: 1});
        setIsVisible(false);
      }
    },
    [isAuth, navigation, salonId],
  );

  // Improved handleService that uses cache + in-flight promise map
  const handleService = useCallback(async uid => {
    if (!uid) {
      return;
    }
    try {
      // cached
      if (subServicesCache.has(uid)) {
        const cached = subServicesCache.get(uid);
        setSubService(cached.data || []);
        setIsVisible(true);
        return;
      }

      // in-flight
      if (subServicesPromises.has(uid)) {
        const res = await subServicesPromises.get(uid);
        setSubService(res.data || []);
        setIsVisible(true);
        return;
      }

      // create promise
      const promise = (async () => {
        const data = await getSubServices(uid);
        const prices = (data || [])
          .map(s => {
            const priceNum = parseFloat(s.price);
            return Number.isFinite(priceNum) ? priceNum : null;
          })
          .filter(pv => pv != null);

        const durations = (data || [])
          .map(s => {
            const d = parseInt(s.duration, 10);
            return Number.isFinite(d) ? d : null;
          })
          .filter(dv => dv != null);

        const payload = {
          data: data || [],
          min_price: prices.length ? Math.min(...prices) : null,
          max_price: prices.length ? Math.max(...prices) : null,
          min_duration: durations.length ? Math.min(...durations) : null,
          max_duration: durations.length ? Math.max(...durations) : null,
        };

        subServicesCache.set(uid, payload);
        return payload;
      })();

      subServicesPromises.set(uid, promise);

      const result = await promise;
      setSubService(result.data || []);
      setIsVisible(true);
    } catch (error) {
      console.log('handleService error', error);
    } finally {
      if (subServicesPromises.has(uid)) {
        subServicesPromises.delete(uid);
      }
    }
  }, []);

  // wrapper to use as renderItem (synchronous)
  const renderServiceItem = useCallback(
    ({item}) => (
      <ServiceItem
        item={item}
        isRTL={isRTL}
        t={t}
        i18n={i18n}
        DateBook={DateBook}
        handleServiceLocal={handleService}
      />
    ),
    [isRTL, t, DateBook, handleService],
  );

  const logoSource =
    SalonInfo?.images?.logo &&
    SalonInfo?.images?.logo !==
      'https://dashboard.ontimeqa.com/backend/assets/images/default-salon-logo.png' &&
    SalonInfo?.images?.logo !== '/storage/0'
      ? {uri: `${hostImge}${SalonInfo.images.logo}`}
      : appLogo;

  return (
    <SafeAreaView
      style={[styles.safeArea, {writingDirection: isRTL ? 'rtl' : 'ltr'}]}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={[styles.header, {paddingHorizontal: 35, padding: 15}]}>
        <Ionicons
          name={isRTL ? 'arrow-forward' : 'arrow-back'}
          size={25}
          onPress={handleGoBack}
        />
      </View>

      {loading ? (
        // full-screen initial loader
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}>
          <>
            <View style={[styles.salonInfoContainer]}>
              <Image
                source={logoSource}
                style={styles.salonLogo}
                resizeMode="cover"
              />
              <View style={styles.salonDetailsContainer}>
                <Text style={[styles.title]} numberOfLines={1}>
                  {isRTL ? SalonInfo?.name_ar : SalonInfo?.name}
                </Text>
                <Text style={[styles.description]} numberOfLines={2}>
                  {isRTL ? SalonInfo?.description_ar : SalonInfo?.description}
                </Text>
                <View style={[styles.locationContainer]}>
                  <Ionicons name="location" size={15} color={Colors.primary} />
                  <Text
                    style={[
                      styles.locationText,
                      {
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                    numberOfLines={1}>
                    {SalonInfo?.location?.address}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.serviceContainer}>
              <Text
                style={[
                  styles.categoryTitle,
                  {textAlign: isRTL ? 'right' : 'left'},
                ]}>
                {CatName}
              </Text>
              {Error ? (
                <Text style={[styles.categoryTitle, {top: 15, fontSize: 16}]}>
                  {Error}
                </Text>
              ) : (
                <>
                  <View>
                    <FlatList
                      nestedScrollEnabled
                      data={subCat}
                      renderItem={({item}) => (
                        <TouchableOpacity
                          style={[
                            styles.filterItem,
                            {
                              backgroundColor:
                                selectedLocation === item.uuid
                                  ? Colors.primary
                                  : 'white',
                            },
                          ]}
                          onPress={() => {
                            if (selectedLocation !== item.uuid) {
                              setSelectedLocation(item.uuid);
                              fetchData(item.uuid);
                            }
                          }}
                          activeOpacity={0.7}>
                          <View style={{flexDirection: 'row'}}>
                            <Text
                              style={[
                                styles.filterItemText,
                                {
                                  color:
                                    selectedLocation === item.uuid
                                      ? 'white'
                                      : Colors.black3,
                                  textAlign: isRTL ? 'right' : 'left',
                                },
                              ]}>
                              {isRTL ? item.name_ar : item.name}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      keyExtractor={item => item.uuid}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.filterListContainer}
                    />
                  </View>

                  {/* inline loading when changing categories */}
                  {servicesLoading ? (
                    <View style={{paddingVertical: 30, alignItems: 'center'}}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                  ) : (
                    <FlatList
                      nestedScrollEnabled
                      data={salonInfo}
                      renderItem={renderServiceItem}
                      keyExtractor={(item, index) =>
                        item.id ? item.id.toString() : index.toString()
                      }
                      contentContainerStyle={styles.serviceListContainer}
                    />
                  )}
                </>
              )}
            </View>
          </>
          <Modal
            animationType="slide"
            transparent
            visible={isVisible}
            onRequestClose={() => setIsVisible(false)}>
            <Pressable style={styles.modal} onPress={() => setIsVisible(false)}>
              <Pressable style={styles.modal2}>
                <View style={styles.modalHeader}>
                  <Text>{t('Details')}</Text>
                  <Ionicons
                    name="close-outline"
                    size={25}
                    onPress={() => setIsVisible(false)}
                  />
                </View>
                <FlatList
                  data={subService}
                  renderItem={({item}) => (
                    <View
                      style={[
                        styles.serv,
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                        },
                      ]}>
                      <View
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                        <View>
                          <Text style={styles.text}>
                            {i18n.language === 'ar'
                              ? item?.name_ar
                              : item?.name}
                          </Text>
                          <Text style={styles.title2}>
                            {item?.duration} {t('Mins')}
                          </Text>
                        </View>
                        <View
                          style={{
                            alignItems: 'flex-end',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 8,
                          }}>
                          <Text
                            style={{
                              fontWeight: '600',
                              marginBottom: 8,
                              color: Colors.text,
                            }}>
                            {item?.price}{' '}
                            <Text style={{fontSize: 12, color: Colors.text}}>
                              {i18n.language !== 'ar' ? 'QAR' : 'ر.ق'}
                            </Text>
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.selectButton,
                              {paddingHorizontal: 14, borderRadius: 20},
                            ]}
                            onPress={() => DateBook2(item.uuid)}>
                            <Text style={styles.selectButtonText}>
                              {t('Select')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                  keyExtractor={item => item.id.toString()}
                  style={{marginBottom: 50}}
                />
              </Pressable>
            </Pressable>
          </Modal>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    backgroundColor: '#fff',
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  notFoundText: {
    color: Colors.black3,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salonInfoContainer: {
    flexDirection: 'row',
    marginTop: 15,
    padding: 15,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  salonLogo: {
    width: 75,
    height: 75,
    borderRadius: 36,
  },
  salonDetailsContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',

    color: '#202020',
  },
  description: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    color: '#bdc0c5',
    maxWidth: '90%',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 5,
    maxWidth: '90%',
  },
  mapButton: {
    minWidth: 100,
    height: 32,
    backgroundColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  mapButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  serviceContainer: {
    marginTop: 30,
    paddingHorizontal: 10,
  },
  categoryTitle: {
    fontSize: 35,
    color: Colors.text,
    marginBottom: 15,
    fontWeight: 'bold',
    alignSelf: 'center',
    textAlign: 'center',
  },
  filterListContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexGrow: 1,
  },
  filterItem: {
    marginHorizontal: 5,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.primary,
  },
  filterItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  serviceListContainer: {
    paddingTop: 15,
  },
  serv: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.black3 + '40',
  },
  serviceInfoContainer: {
    // flex: 1,
    paddingRight: 10,
  },
  serviceActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  title2: {
    fontSize: 12,
    fontWeight: '500',
    color: '#bdbdbd',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 15,
    margin: 5,
    color: Colors.text,
  },
  selectButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderColor: '#818181',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818181',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 10,
    marginHorizontal: 15,
  },
  modalListContainer: {
    paddingVertical: 10,
  },
  bookButton: {
    height: 55,
    backgroundColor: Colors.primary,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginHorizontal: 20,
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  authModalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  authModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 25,
  },
  loginButton: {
    width: 120,
    height: 45,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  optionButton: {
    paddingVertical: 10,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  modal: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal2: {
    width: '100%',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    backgroundColor: '#fff',
    padding: 15,
    minHeight: 200,
  },
  button: {
    width: 280,
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 25,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
  },
  modalContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    position: 'absolute',
    height: 900,
    width: '100%',
  },
});

export default Service;
