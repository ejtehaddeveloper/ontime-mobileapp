/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useContext,
} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
  Image,
  StatusBar,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  InteractionManager,
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
import {useTranslation} from 'react-i18next';
import hostImge from '../../context/hostImge';

// ======= Persisted global cache to survive HMR / dev reloads =======
const CACHE_GLOBAL_KEY = '__PIXELENGINE_IN_MEMORY_CACHE_V1__';
const inMemoryCache =
  (typeof global !== 'undefined' && global[CACHE_GLOBAL_KEY]) || new Map();
if (typeof global !== 'undefined') {
  global[CACHE_GLOBAL_KEY] = inMemoryCache;
}
// ===================================================================

// how many services to prewarm subservices for (first N)
const PREWARM_COUNT = 3;

// fallback app logo - adjust path if you store it elsewhere
const appLogo = require('../../assets/images/logo.jpg');

const Service = ({route}) => {
  const {t} = useTranslation();
  const {salonId, uuid, CatName} = route.params;
  const {isAuth} = useContext(AuthContext);
  const navigation = useNavigation();
  const isRTL = i18n.language === 'ar';

  // main state
  const [salonDetails, setSalonDetails] = useState(null);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [subServices, setSubServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [loading, setLoading] = useState(true); // initial page load
  const [categoryLoading, setCategoryLoading] = useState(false); // loading services for category
  const [subServiceLoading, setSubServiceLoading] = useState(false); // loading subservices for modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // mounted ref
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // FlatList ref + optional remount key
  const flatRef = useRef(null);
  const [listKey, setListKey] = useState(0);

  // small helper to nudge list layout on iOS
  const nudgeFlatListLayout = useCallback(() => {
    if (Platform.OS === 'ios') {
      requestAnimationFrame(() => {
        flatRef.current?.scrollToOffset?.({offset: 0, animated: false});
      });
    }
  }, []);

  // ensure consistent cache key
  const cacheKey = String(salonId);

  // pending navigation ref used when we need to close modal first then navigate
  // shape: { uuid: string, isSub: boolean } or null
  const pendingNavRef = useRef(null);

  // initial load (salon details + categories + initial services)
  useEffect(() => {
    let cancelled = false;

    const loadFromCache = () => {
      const cached = inMemoryCache.get(cacheKey);
      if (!cached) {
        return false;
      }
      if (!cancelled && mountedRef.current) {
        setSalonDetails(cached.salonDetails ?? null);
        setCategories(
          Array.isArray(cached.categories) ? [...cached.categories] : [],
        );
        const initialCat =
          cached.selectedCategory ??
          (cached.categories && cached.categories[0]
            ? cached.categories[0].uuid
            : null);
        setSelectedCategory(initialCat);
        const svcs =
          (cached.servicesForCategory &&
            cached.servicesForCategory[initialCat]) ||
          [];
        setServices(Array.isArray(svcs) ? [...svcs] : []);
        setErrorMsg(cached.errorMsg ?? '');
        setLoading(false);
        nudgeFlatListLayout();
      }
      return true;
    };

    const fetchAndCache = async (categoryUuid = null, isInitial = false) => {
      try {
        if (isInitial) {
          setLoading(true);
        }

        const [salonResp, categoriesResp] = await Promise.all([
          getSalons(salonId),
          getSubCategory(uuid, salonId),
        ]);

        const incomingSalonDetails = salonResp ?? null;
        const incomingCategories = Array.isArray(categoriesResp)
          ? categoriesResp
          : [];

        const activeUuid =
          categoryUuid ??
          (incomingCategories[0] ? incomingCategories[0].uuid : null);

        let servicesResp = [];
        if (activeUuid) {
          servicesResp = (await getServices(salonId, activeUuid)) ?? [];
        }

        if (!cancelled && mountedRef.current) {
          const cached = inMemoryCache.get(cacheKey) || {};
          const newCache = {
            ...cached,
            salonDetails: incomingSalonDetails,
            categories: incomingCategories,
            servicesForCategory: {
              ...(cached.servicesForCategory || {}),
              [activeUuid]: servicesResp,
            },
            selectedCategory: activeUuid,
            lastFetchedAt: Date.now(),
          };
          inMemoryCache.set(cacheKey, newCache);

          setSalonDetails(incomingSalonDetails);
          setCategories(
            Array.isArray(incomingCategories) ? [...incomingCategories] : [],
          );
          setSelectedCategory(activeUuid);
          setServices(Array.isArray(servicesResp) ? [...servicesResp] : []);
          setErrorMsg('');
          nudgeFlatListLayout();
        }
      } catch (err) {
        console.log('Service fetch error', err);
        if (!cancelled && mountedRef.current) {
          setErrorMsg(t('There is no services right now'));
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    };

    const hadCache = loadFromCache();
    fetchAndCache(hadCache ? undefined : null, !hadCache);

    return () => {
      cancelled = true;
    };
  }, [salonId, uuid, cacheKey, nudgeFlatListLayout, t]);

  // category selection — fetch services and prewarm subservices for first N
  const handleCategorySelect = useCallback(
    async catUuid => {
      if (!catUuid) {
        setSelectedCategory(null);
        setServices([]);
        return;
      }
      if (selectedCategory === catUuid) {
        setSelectedCategory(null);
        setServices([]);
        return;
      }

      setCategoryLoading(true);
      try {
        const cached = inMemoryCache.get(cacheKey) || {};
        if (
          cached.servicesForCategory &&
          Array.isArray(cached.servicesForCategory[catUuid])
        ) {
          const svcFromCache = cached.servicesForCategory[catUuid];
          setServices(Array.isArray(svcFromCache) ? [...svcFromCache] : []);
          setSelectedCategory(catUuid);
          setErrorMsg('');
          nudgeFlatListLayout();
        } else {
          const svc = (await getServices(salonId, catUuid)) ?? [];
          setServices(Array.isArray(svc) ? [...svc] : []);
          setSelectedCategory(catUuid);
          setErrorMsg('');
          inMemoryCache.set(cacheKey, {
            ...cached,
            servicesForCategory: {
              ...(cached.servicesForCategory || {}),
              [catUuid]: svc,
            },
            selectedCategory: catUuid,
            lastFetchedAt: Date.now(),
          });
        }

        const cacheAfter = inMemoryCache.get(cacheKey) || {};
        const svcList =
          cacheAfter.servicesForCategory &&
          cacheAfter.servicesForCategory[catUuid]
            ? cacheAfter.servicesForCategory[catUuid]
            : Array.isArray(services)
            ? services
            : [];

        if (Array.isArray(svcList) && svcList.length > 0) {
          const toPrewarm = svcList
            .slice(0, PREWARM_COUNT)
            .map(s => s.uuid)
            .filter(Boolean);

          const missing = [];
          const cachedSubMap = cacheAfter.subServicesForService || {};
          toPrewarm.forEach(uuidToCheck => {
            if (!Array.isArray(cachedSubMap[uuidToCheck]))
              missing.push(uuidToCheck);
          });

          if (missing.length > 0) {
            try {
              const prePromises = missing.map(u =>
                getSubServices(u).catch(() => []),
              );
              const allSubs = await Promise.all(prePromises);
              const newSubMap = {...(cacheAfter.subServicesForService || {})};
              cacheAfter.servicesForCategory =
                cacheAfter.servicesForCategory || {};
              const svcArr = cacheAfter.servicesForCategory[catUuid] || svcList;

              missing.forEach((m, idx) => {
                const subsForM = Array.isArray(allSubs[idx])
                  ? allSubs[idx]
                  : [];
                newSubMap[m] = subsForM;

                const prices = subsForM
                  .map(x => {
                    const p = parseFloat(x.price);
                    return Number.isFinite(p) ? p : null;
                  })
                  .filter(Boolean);
                const durations = subsForM
                  .map(x => {
                    const d = parseInt(x.duration, 10);
                    return Number.isFinite(d) ? d : null;
                  })
                  .filter(Boolean);
                const min_price = prices.length ? Math.min(...prices) : null;
                const max_price = prices.length ? Math.max(...prices) : null;
                const min_duration = durations.length
                  ? Math.min(...durations)
                  : null;
                const max_duration = durations.length
                  ? Math.max(...durations)
                  : null;

                cacheAfter.servicesForCategory[catUuid] = svcArr.map(s => {
                  if (s.uuid === m) {
                    return {
                      ...s,
                      min_price,
                      max_price,
                      min_duration,
                      max_duration,
                    };
                  }
                  return s;
                });
              });

              inMemoryCache.set(cacheKey, {
                ...cacheAfter,
                subServicesForService: newSubMap,
                servicesForCategory: cacheAfter.servicesForCategory,
                lastFetchedAt: Date.now(),
              });

              if (mountedRef.current && selectedCategory === catUuid) {
                const arr =
                  cacheAfter.servicesForCategory &&
                  cacheAfter.servicesForCategory[catUuid]
                    ? cacheAfter.servicesForCategory[catUuid]
                    : services;
                setServices(Array.isArray(arr) ? [...arr] : services);
                nudgeFlatListLayout();
              }
            } catch (err) {
              console.log('prewarm subservices error', err);
            }
          }
        }
      } catch (err) {
        console.log('Error fetching services for category', err);
        setErrorMsg(t('There is no services right now'));
      } finally {
        setCategoryLoading(false);
      }
    },
    [cacheKey, nudgeFlatListLayout, salonId, selectedCategory, services, t],
  );

  // open datebook
  const openDateBook = useCallback(
    (serviceID, isSub = false) => {
      if (!isAuth) {
        navigation.navigate('Auth');
        return;
      }
      navigation.navigate('DateBook', {
        salonId,
        serviceID,
        isSubService: isSub ? 1 : 0,
      });
    },
    [navigation, isAuth, salonId],
  );

  // open subservices modal (cached first) — improved: writes cache and uses prewarm map
  const handleOpenSubServices = useCallback(
    async serviceUuid => {
      if (!serviceUuid) return;
      setSubServiceLoading(true);
      try {
        const cached = inMemoryCache.get(cacheKey) || {};
        const cachedList =
          cached.subServicesForService &&
          cached.subServicesForService[serviceUuid];
        if (Array.isArray(cachedList)) {
          setSubServices(Array.isArray(cachedList) ? [...cachedList] : []);
          setShowSubModal(true);
          nudgeFlatListLayout();
          return;
        }
        const subs = (await getSubServices(serviceUuid)) ?? [];
        setSubServices(Array.isArray(subs) ? [...subs] : []);
        setShowSubModal(true);
        inMemoryCache.set(cacheKey, {
          ...cached,
          subServicesForService: {
            ...(cached.subServicesForService || {}),
            [serviceUuid]: subs,
          },
          lastFetchedAt: Date.now(),
        });
        nudgeFlatListLayout();
      } catch (err) {
        console.log('Error fetching subservices', err);
        setSubServices([]);
        setShowSubModal(true);
      } finally {
        setSubServiceLoading(false);
      }
    },
    [cacheKey, nudgeFlatListLayout],
  );

  // Called when user selects a subservice in the modal.
  // Close modal first then navigate after dismiss/interaction finishes.
  const handleSelectSubFromModal = useCallback(
    serviceUuid => {
      if (!serviceUuid) return;

      // stash pending navigation info
      pendingNavRef.current = {uuid: serviceUuid, isSub: true};

      // close the modal first
      setShowSubModal(false);

      // For Android (and fallback), run after interactions and navigate if still pending.
      InteractionManager.runAfterInteractions(() => {
        const pending = pendingNavRef.current;
        if (pending) {
          openDateBook(pending.uuid, pending.isSub);
          pendingNavRef.current = null;
        }
      });
    },
    [openDateBook],
  );

  // stable item renderer (no async inside)
  const renderServiceItem = useCallback(
    ({item}) => {
      const isSub = !!item?.has_sub_services;
      const durationText = isSub
        ? item?.min_duration != null && item?.max_duration != null
          ? `${item.min_duration} - ${item.max_duration} ${t('Mins')}`
          : `${t('Mins')}`
        : `${item?.duration ?? ''} ${t('Mins')}`;
      const priceText = isSub
        ? item?.min_price != null && item?.max_price != null
          ? `${item.min_price} - ${item.max_price} QAR`
          : ''
        : item?.price != null
        ? `${item.price} QAR`
        : '';

      return (
        <TouchableOpacity
          style={styles.serv}
          activeOpacity={0.85}
          onPress={() =>
            isSub
              ? handleOpenSubServices(item.uuid)
              : openDateBook(item.uuid, false)
          }>
          <View style={styles.serviceInfoContainer}>
            <Text
              style={[styles.text, {textAlign: isRTL ? 'right' : 'left'}]}
              numberOfLines={2}>
              {isRTL ? item?.name_ar : item?.name}
            </Text>
            <Text style={styles.title2}>{durationText}</Text>
          </View>

          <View style={styles.serviceActionContainer}>
            <Text style={styles.priceText}>{priceText}</Text>
            <TouchableOpacity
              style={[styles.selectButton, isSub ? styles.detailsButton : null]}
              onPress={() =>
                isSub
                  ? handleOpenSubServices(item.uuid)
                  : openDateBook(item.uuid, false)
              }>
              <Text style={styles.selectButtonText}>
                {t(isSub ? 'Details' : 'Select')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [handleOpenSubServices, openDateBook, isRTL, t],
  );

  const keyExtractor = useCallback(
    (item, index) => String(item?.uuid ?? item?.id ?? index),
    [],
  );

  // skeleton placeholder while loading services
  const ServiceSkeleton = () => {
    const skeletons = new Array(6).fill(0);
    return (
      <View style={{paddingHorizontal: 14}}>
        {skeletons.map((_, idx) => (
          <View key={idx} style={styles.skeletonRow}>
            <View style={styles.skeletonLeft} />
            <View style={{flex: 1, marginLeft: 12}}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonMeta} />
            </View>
            <View style={styles.skeletonRight} />
          </View>
        ))}
      </View>
    );
  };

  // List header (salon info + categories)
  const ListHeader = useCallback(() => {
    const logoSource =
      salonDetails && salonDetails.images && salonDetails.images.logo
        ? {uri: `${hostImge}${salonDetails.images.logo}`}
        : appLogo;

    return (
      <View>
        <View style={styles.salonInfoContainer}>
          <Image
            source={logoSource}
            style={styles.salonLogo}
            resizeMode="cover"
            accessibilityLabel={salonDetails?.name ?? 'Salon logo'}
          />
          <View style={styles.salonDetailsContainer}>
            <Text style={[styles.title]} numberOfLines={1}>
              {isRTL ? salonDetails?.name_ar : salonDetails?.name}
            </Text>
            <Text style={[styles.description]} numberOfLines={2}>
              {isRTL ? salonDetails?.description_ar : salonDetails?.description}
            </Text>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={[styles.locationText]} numberOfLines={1}>
                {salonDetails?.location?.address}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.categoriesWrap}>
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={it => String(it.uuid)}
            renderItem={({item}) => {
              const active = selectedCategory === item.uuid;
              return (
                <TouchableOpacity
                  style={[
                    styles.filterItem,
                    active ? styles.filterItemActive : null,
                  ]}
                  onPress={() => handleCategorySelect(item.uuid)}
                  activeOpacity={0.85}>
                  <Text
                    style={[
                      styles.filterItemText,
                      {color: active ? '#fff' : Colors.black3},
                    ]}>
                    {isRTL ? item.name_ar : item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.filterListContainer}
            initialNumToRender={6}
            removeClippedSubviews={false}
          />
        </View>
      </View>
    );
  }, [salonDetails, categories, selectedCategory, handleCategorySelect, isRTL]);

  // Subservices modal row renderer
  const renderSubServiceRow = useCallback(
    ({item}) => {
      return (
        <View style={styles.subServRow}>
          <View style={{flex: 1}}>
            <Text style={styles.text}>{item?.name}</Text>
            <Text style={styles.title2}>
              {item?.duration} {t('Mins')}
            </Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <Text style={styles.priceText}>
              {item?.price} <Text style={{fontSize: 12}}>QAR</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectButtonSmall}
              onPress={() => handleSelectSubFromModal(item.uuid)}>
              <Text style={styles.selectButtonText}>{t('Select')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [handleSelectSubFromModal, t],
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, {writingDirection: isRTL ? 'rtl' : 'ltr'}]}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View
        style={[styles.header, {paddingHorizontal: 20, paddingVertical: 12}]}>
        <Ionicons
          name={isRTL ? 'arrow-forward' : 'arrow-back'}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.screenTitle}>{CatName ?? ''}</Text>
        <View style={{width: 24}} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          key={String(listKey)}
          data={Array.isArray(services) ? services : []}
          extraData={selectedCategory ?? services?.length}
          renderItem={renderServiceItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListHeaderComponentStyle={{paddingBottom: 12}}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={false}
          nestedScrollEnabled={Platform.OS === 'android'}
          ListEmptyComponent={
            categoryLoading ? (
              <ServiceSkeleton />
            ) : (
              <Text style={styles.emptyText}>
                {errorMsg || t('No services found')}
              </Text>
            )
          }
          ItemSeparatorComponent={() => <View style={{height: 8}} />}
        />
      )}

      {/* DETAILS (subservices) modal — restyled bottom sheet */}
      <Modal
        visible={showSubModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          // Clear any pending nav if user dismisses
          pendingNavRef.current = null;
          setShowSubModal(false);
        }}
        onDismiss={() => {
          // This fires on iOS when modal fully dismissed — perform pending navigation if any
          const pending = pendingNavRef.current;
          if (pending) {
            openDateBook(pending.uuid, pending.isSub);
            pendingNavRef.current = null;
          }
        }}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            pendingNavRef.current = null; // clear pending navigation if user taps outside to cancel
            setShowSubModal(false);
          }}>
          <Pressable
            style={styles.modalSheet}
            onPress={e => e.stopPropagation()}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Details')}</Text>
              <TouchableOpacity
                onPress={() => {
                  pendingNavRef.current = null;
                  setShowSubModal(false);
                }}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Ionicons name="close-outline" size={22} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            {subServiceLoading ? (
              <View style={styles.subLoadingWrap}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : subServices && subServices.length > 0 ? (
              <FlatList
                data={subServices}
                renderItem={renderSubServiceRow}
                keyExtractor={it => String(it.id)}
                ItemSeparatorComponent={() => <View style={{height: 10}} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{paddingBottom: 28, paddingTop: 6}}
                nestedScrollEnabled={false}
                removeClippedSubviews={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {t('No details available')}
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#fff'},
  contentContainer: {
    paddingBottom: 30,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {fontWeight: '700', fontSize: 16, color: Colors.text},
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },

  salonInfoContainer: {
    flexDirection: 'row',
    marginTop: 10,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  salonLogo: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: Colors.border,
  },
  salonDetailsContainer: {flex: 1, paddingLeft: 12, paddingRight: 6},
  title: {fontSize: 18, fontWeight: '700', color: '#222'},
  description: {fontSize: 13, color: '#7d8790', marginTop: 6},
  locationContainer: {flexDirection: 'row', alignItems: 'center', marginTop: 8},
  locationText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 6,
    maxWidth: '78%',
  },

  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
    borderRadius: 4,
  },
  categoriesWrap: {paddingBottom: 8},
  filterListContainer: {paddingLeft: 6, paddingRight: 6},
  filterItem: {
    marginHorizontal: 6,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.primary,
    backgroundColor: '#fff',
  },
  filterItemActive: {backgroundColor: Colors.primary},
  filterItemText: {fontSize: 14, fontWeight: '500'},

  serv: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.black3 + '10',
  },
  serviceInfoContainer: {flex: 1, paddingRight: 12},
  serviceActionContainer: {flexDirection: 'row', alignItems: 'center'},
  text: {color: Colors.text, fontSize: 16, fontWeight: '700'},
  title2: {fontSize: 12, color: '#9aa0a6', marginTop: 6},
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginRight: 10,
  },
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#8b8b8b',
    backgroundColor: '#fff',
  },
  detailsButton: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  selectButtonText: {fontSize: 12, fontWeight: '700', color: '#4b5563'},

  selectButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8b8b8b',
    backgroundColor: '#fff',
    marginTop: 6,
  },

  emptyText: {textAlign: 'center', marginTop: 20, color: '#8b8b8b'},

  // skeleton styles
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  skeletonLeft: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  skeletonTitle: {
    width: '60%',
    height: 14,
    borderRadius: 6,
    backgroundColor: '#eee',
    marginBottom: 8,
  },
  skeletonMeta: {
    width: '40%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f2f2f2',
  },
  skeletonRight: {
    width: 64,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eee',
    marginLeft: 12,
  },

  // modal (bottom sheet)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    width: '100%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#e6e6e6',
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {fontWeight: '700', fontSize: 16},

  subServRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  subLoadingWrap: {paddingVertical: 24, alignItems: 'center'},
  emptyState: {paddingVertical: 24, alignItems: 'center'},
});

export default Service;
