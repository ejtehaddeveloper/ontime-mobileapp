/* eslint-disable react-native/no-inline-styles */
import React, {useContext, useEffect, useState} from 'react';
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
import Loading from '../../assets/common/Loading';
import i18n from '../../assets/locales/i18';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import hostImge from '../../context/hostImge';
import {useRef, useCallback} from 'react';

const Service = ({route}) => {
  const viewabilityConfigRef = useRef({viewAreaCoveragePercentThreshold: 10});

  const [subServicesMap, setSubServicesMap] = useState({}); // cache { [uid]: [...] }
  const [loadingSubs, setLoadingSubs] = useState({}); // { [uid]: true/false }
  const {t} = useTranslation();
  const {salonId, uuid, CatName} = route.params;
  const {isAuth} = useContext(AuthContext);
  const navigation = useNavigation();
  const isRTL = i18n.language === 'ar';

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [salonInfo, setSalons] = useState([]);
  const [subCat, setSubCat] = useState([]);
  const [subService, setSubService] = useState([]);
  const [SalonInfo, setSalonInfo] = useState([]);
  const [loading, setloading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [Error, setError] = useState('');

  const handleGoBack = () => navigation.goBack();
  const onViewableItemsChanged = useRef(({viewableItems}) => {
    // prefetch subservices for visible items that have sub-services AND are not cached/loading
    viewableItems.forEach(({item}) => {
      if (
        item?.has_sub_services &&
        !subServicesMap[item.uuid] &&
        !loadingSubs[item.uuid]
      ) {
        fetchSubServicesCached(item.uuid);
      }
    });
  });
  const fetchData = async uid => {
    try {
      const data = await getServices(salonId, uid);
      setSalons(data);
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      setloading(false);
    }
  };

  useEffect(() => {
    const fetchSalonData = async () => {
      try {
        const data = await getSalons(salonId);
        setSalonInfo(data);
      } catch (error) {
        console.log('Error fetching data:', error);
      }
    };

    const fetchSubCat = async () => {
      try {
        const data = await getSubCategory(uuid, salonId);
        setSubCat(data);
        if (data && data.length > 0) {
          setSelectedLocation(data[0].uuid);
          fetchData(data[0].uuid);
        } else {
          setError(t('There is no services right now'));
        }
      } catch (error) {
        console.log('Error fetching data:', error);
      } finally {
        setloading(false);
      }
    };

    fetchSalonData();
    fetchSubCat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth, salonId, uuid]);

  const DateBook = serviceID => {
    if (!isAuth) {
      navigation.navigate('Auth');
      setIsVisible(false);
    } else {
      navigation.navigate('DateBook', {salonId, serviceID, isSubService: 0});
      setIsVisible(false);
    }
  };

  const DateBook2 = serviceID => {
    if (!isAuth) {
      navigation.navigate('Auth');
      setIsVisible(false);
    } else {
      navigation.navigate('DateBook', {salonId, serviceID, isSubService: 1});
      setIsVisible(false);
    }
  };
  const fetchSubServicesCached = async uid => {
    if (!uid) return null;
    // return cached immediately
    if (subServicesMap[uid]) return subServicesMap[uid];

    // avoid duplicate fetches
    if (loadingSubs[uid]) return null;

    setLoadingSubs(prev => ({...prev, [uid]: true}));
    try {
      const data = await getSubServices(uid);
      const safeData = Array.isArray(data) ? data : [];

      // compute min/max price and duration
      const prices = safeData
        .map(s => parseFloat(s.price))
        .filter(p => Number.isFinite(p));
      const durations = safeData
        .map(s => parseInt(s.duration, 10))
        .filter(d => Number.isFinite(d));

      const min_price = prices.length ? Math.min(...prices) : null;
      const max_price = prices.length ? Math.max(...prices) : null;
      const min_duration = durations.length ? Math.min(...durations) : null;
      const max_duration = durations.length ? Math.max(...durations) : null;

      // cache
      setSubServicesMap(prev => ({...prev, [uid]: safeData}));

      // inject into salonInfo so FlatList data identity changes
      setSalons(prev =>
        prev.map(s =>
          s.uuid === uid
            ? {...s, min_price, max_price, min_duration, max_duration}
            : s,
        ),
      );

      return safeData;
    } catch (err) {
      console.log('fetchSubServicesCached error', uid, err);
      setSubServicesMap(prev => ({...prev, [uid]: []}));
      return [];
    } finally {
      setLoadingSubs(prev => ({...prev, [uid]: false}));
    }
  };
  const handleService = async uid => {
    const data = await fetchSubServicesCached(uid);
    setSubService(data || []);
    setIsVisible(true);
  };

  const renderServiceItem = ({item}) => {
    const isSub = !!item?.has_sub_services;
    const cached = subServicesMap[item.uuid];
    const isLoading = !!loadingSubs[item.uuid];

    const minPrice =
      item.min_price ??
      (cached
        ? (() => {
            const p = cached
              .map(s => parseFloat(s.price))
              .filter(Number.isFinite);
            return p.length ? Math.min(...p) : null;
          })()
        : null);

    const maxPrice =
      item.max_price ??
      (cached
        ? (() => {
            const p = cached
              .map(s => parseFloat(s.price))
              .filter(Number.isFinite);
            return p.length ? Math.max(...p) : null;
          })()
        : null);

    const minDuration =
      item.min_duration ??
      (cached
        ? (() => {
            const d = cached
              .map(s => parseInt(s.duration, 10))
              .filter(Number.isFinite);
            return d.length ? Math.min(...d) : null;
          })()
        : null);

    const maxDuration =
      item.max_duration ??
      (cached
        ? (() => {
            const d = cached
              .map(s => parseInt(s.duration, 10))
              .filter(Number.isFinite);
            return d.length ? Math.max(...d) : null;
          })()
        : null);

    const singlePrice = item?.price;

    return (
      <TouchableOpacity
        style={styles.serv}
        onPress={() =>
          isSub ? handleService(item.uuid) : DateBook(item.uuid)
        }>
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
                ? isLoading
                  ? t('Loading...')
                  : minDuration != null && maxDuration != null
                  ? `${minDuration} - ${maxDuration} ${t('Mins')}`
                  : '-'
                : `${item?.duration} ${t('Mins')}`}
            </Text>
          </View>
        </View>

        <View style={styles.serviceActionContainer}>
          {!isSub ? (
            <Text style={styles.priceText}>
              {singlePrice} <Text style={{fontSize: 12}}>QAR</Text>
            </Text>
          ) : (
            <Text style={styles.priceText}>
              {isLoading
                ? t('...')
                : minPrice != null && maxPrice != null
                ? `${minPrice} - ${maxPrice} QAR`
                : '-'}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.selectButton, isSub ? styles.detailsButton : null]}
            onPress={() =>
              isSub ? handleService(item.uuid) : DateBook(item.uuid)
            }>
            <Text style={styles.selectButtonText}>
              {t(isSub ? 'Details' : 'Select')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderServiceItem2 = ({item}) => (
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
          <Text style={styles.text}>{item?.name}</Text>
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
            style={{fontWeight: '600', marginBottom: 8, color: Colors.text}}>
            {item?.price}{' '}
            <Text style={{fontSize: 12, color: Colors.text}}>QAR</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.selectButton,
              {paddingHorizontal: 14, borderRadius: 20},
            ]}
            onPress={() => DateBook2(item.uuid)}>
            <Text style={styles.selectButtonText}>{t('Select')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <Loading />
        ) : (
          <>
            <View style={[styles.salonInfoContainer]}>
              <Image
                source={{uri: `${hostImge}${SalonInfo?.images?.logo}`}}
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
                          onPressIn={async () => {
                            setSelectedLocation(
                              item.uuid === selectedLocation ? null : item.uuid,
                            );
                            await fetchData(item.uuid);
                          }}
                          activeOpacity={0.7}>
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
                        </TouchableOpacity>
                      )}
                      keyExtractor={item => item.uuid}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.filterListContainer}
                    />
                  </View>

                  <FlatList
                    nestedScrollEnabled
                    data={salonInfo}
                    renderItem={renderServiceItem}
                    keyExtractor={(item, index) =>
                      item.id ? item.id.toString() : index.toString()
                    }
                    contentContainerStyle={styles.serviceListContainer}
                    extraData={{subServicesMap, loadingSubs, salonInfo}}
                    onViewableItemsChanged={onViewableItemsChanged.current}
                    viewabilityConfig={viewabilityConfigRef.current}
                    removeClippedSubviews={true}
                  />
                </>
              )}
            </View>
          </>
        )}
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
                renderItem={renderServiceItem2}
                keyExtractor={item => item.id.toString()}
                style={{marginBottom: 50}}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
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
  // modalOverlay: {
  //   flex: 1,
  //   backgroundColor: 'rgba(0,0,0,0.5)',
  //   justifyContent: 'flex-end',
  // },
  // modalContent: {
  //   backgroundColor: '#fff',
  //   borderTopLeftRadius: 30,
  //   borderTopRightRadius: 30,
  //   padding: 20,
  // },
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
  // modalHeaderTitle: {
  //   fontSize: 18,
  //   fontWeight: '600',
  // },
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
  // modalHeader: {
  //   padding: 10,
  //   marginBottom: 15,
  // },
  modalContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    position: 'absolute',
    height: 900,
    width: '100%',
  },
  // modalContent: {
  //   alignItems: 'center',
  //   borderWidth: 1,
  //   elevation: 10,
  //   backgroundColor: '#fff',
  //   justifyContent: 'center',
  //   marginTop: 350,
  //   alignSelf: 'center',
  //   height: 150,
  //   padding: 20,
  //   borderColor: Colors.border,
  //   borderRadius: 15,
  // },
});

export default Service;
