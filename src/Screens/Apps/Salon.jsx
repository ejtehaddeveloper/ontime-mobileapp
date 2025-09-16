/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
/* RTL-friendly Salon screen — FlatList is the single scroll container (fixes nested VirtualizedList warning) */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Pressable,
  FlatList,
  useWindowDimensions,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Modal,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import AdSlider from '../../assets/common/adsSlider';
import {AuthContext} from '../../context/AuthContext';
import {
  deletefavorite,
  favorite,
  getCategory,
  getSalons,
  IFfavorite,
} from '../../context/api';
import i18n from '../../assets/locales/i18';
import {t} from 'i18next';
import {SvgXml} from 'react-native-svg';
import hostImge from '../../context/hostImge';

const salonCache = new Map();

const svgCache = new Map();
const SvgImage = React.memo(({imageUrl, width = 80, height = 80}) => {
  const [xml, setXml] = useState(
    () => (imageUrl && svgCache.get(imageUrl)) || null,
  );
  useEffect(() => {
    let mounted = true;
    if (!imageUrl) {
      return;
    }
    const cached = svgCache.get(imageUrl);
    if (cached) {
      setXml(cached);
      return;
    }
    fetch(imageUrl)
      .then(res => res.text())
      .then(text => {
        if (!mounted) {
          return;
        }
        svgCache.set(imageUrl, text);
        setXml(text);
      })
      .catch(err => {
        console.log('Svg fetch error', err);
      });
    return () => (mounted = false);
  }, [imageUrl]);

  if (!xml) {
    return null;
  }
  return <SvgXml xml={xml} width={width} height={height} />;
});

const Header = React.memo(({onBack, onToggleFav, isFav, isRTL}) => {
  return (
    <View style={styles.header}>
      <Ionicons
        name={isRTL ? 'arrow-forward' : 'arrow-back'}
        size={25}
        onPress={onBack}
        accessibilityLabel={t('Back')}
      />
      <TouchableOpacity
        onPress={onToggleFav}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        {isFav ? (
          <Ionicons name="heart" size={25} color={Colors.primary} />
        ) : (
          <Ionicons name="heart-outline" size={25} color={Colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
});

const CategoryItem = React.memo(({item, onPress, isRTL, itemWidth}) => {
  const title = isRTL ? item.name_ar : item.name;
  return (
    <TouchableOpacity
      style={[styles.categoryItem, {width: itemWidth}]}
      onPress={() => onPress(item.uuid, title)}>
      <SvgImage imageUrl={item?.image} width={80} height={80} />
      <Text style={styles.categoryTitle} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
});

const AuthModal = ({visible, onClose, onLogin}) => {
  if (!visible) {
    return null;
  }
  return (
    <Pressable style={styles.modalContainer} onPress={onClose}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>
          {t('You should log in to add to favorites')}
        </Text>
        <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
          <Text style={styles.loginButtonText}>{t('Login')}</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

// -------- helper: shallow compare lists of categories by id --------
const areCategoriesDifferent = (a = [], b = []) => {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return true;
  }
  if (a.length !== b.length) {
    return true;
  }
  for (let i = 0; i < a.length; i++) {
    if (String(a[i]?.id) !== String(b[i]?.id)) {
      return true;
    }
  }
  return false;
};

function useSalonDataWithCache(salonId, isAuth) {
  const [salon, setSalon] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  // keep a ref to mounted to avoid updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCacheLoaded(false);
    console.log('Fetching salon data for ID:', salonId);
    const cached = salonCache.get(String(salonId));
    if (cached) {
      // show cache immediately
      if (!cancelled && mountedRef.current) {
        setSalon(cached.salon ?? null);
        setCategories(
          Array.isArray(cached.categories) ? cached.categories : [],
        );
        setIsFav(!!cached.isFav);
        setLoading(false);
        setCacheLoaded(true); // indicate we rendered from cache
        console.log('Salon data from cache:', cached.salon); // <-- log cached salon
      }

      // background fetch to confirm latest data; only update if changed
      Promise.all([
        getSalons(salonId),
        getCategory(salonId),
        isAuth ? IFfavorite(salonId) : Promise.resolve({is_favorite: false}),
      ])
        .then(([s, c, f]) => {
          if (cancelled || !mountedRef.current) {
            return;
          }
          const incomingSalon = s ?? null;
          const incomingCategories = Array.isArray(c) ? c : [];
          const incomingFav = !!(f && f.is_favorite);

          let shouldUpdate = false;
          // compare salon shallowly (id or stringify)
          if (
            String((cached.salon && cached.salon.id) ?? '') !==
            String((incomingSalon && incomingSalon.id) ?? '')
          ) {
            shouldUpdate = true;
          } else if (
            areCategoriesDifferent(cached.categories, incomingCategories)
          ) {
            shouldUpdate = true;
          } else if (!!cached.isFav !== incomingFav) {
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            salonCache.set(String(salonId), {
              salon: incomingSalon,
              categories: incomingCategories,
              isFav: incomingFav,
              lastFetchedAt: Date.now(),
            });
            if (mountedRef.current) {
              setSalon(incomingSalon);
              setCategories(incomingCategories);
              setIsFav(incomingFav);
              console.log('Salon data after background fetch:', incomingSalon); // <-- log fetched salon
            }
          }
        })
        .catch(err => {
          console.log('useSalonData background fetch error', err);
        });

      return () => {
        cancelled = true;
      };
    }

    // no cache: fetch and then cache
    Promise.all([
      getSalons(salonId),
      getCategory(salonId),
      isAuth ? IFfavorite(salonId) : Promise.resolve({is_favorite: false}),
    ])
      .then(([s, c, f]) => {
        if (cancelled || !mountedRef.current) {
          return;
        }
        const incomingSalon = s ?? null;
        const incomingCategories = Array.isArray(c) ? c : [];
        const incomingFav = !!(f && f.is_favorite);

        salonCache.set(String(salonId), {
          salon: incomingSalon,
          categories: incomingCategories,
          isFav: incomingFav,
          lastFetchedAt: Date.now(),
        });

        if (mountedRef.current) {
          setSalon(incomingSalon);
          setCategories(incomingCategories);
          setIsFav(incomingFav);
          console.log('Salon data after initial fetch:', incomingSalon);
        }
      })
      .catch(err => {
        console.log('useSalonData initial fetch error', err);
      })
      .finally(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [salonId, isAuth]);

  const setIsFavAndCache = useCallback(
    next => {
      setIsFav(next);
      const existing = salonCache.get(String(salonId)) ?? {};
      salonCache.set(String(salonId), {
        ...existing,
        isFav: next,
        lastFetchedAt: Date.now(),
      });
    },
    [salonId],
  );

  return {
    salon,
    categories,
    isFav,
    setIsFav: setIsFavAndCache,
    loading,
    cacheLoaded, // <-- returned
  };
}

// --- Main screen
const SalonScreen = ({route}) => {
  const appLogo = require('../../assets/images/logoem.png');
  const {salonId} = route.params;
  const {width} = useWindowDimensions();
  const isRTL = i18n.language === 'ar';
  const navigation = useNavigation();
  const {isAuth} = React.useContext(AuthContext);
  const [showConfirm, setShowConfirm] = useState(false);

  const {salon, categories, isFav, setIsFav, loading, cacheLoaded} =
    useSalonDataWithCache(salonId, isAuth);
  const [authModal, setAuthModal] = useState(false);

  // horizontal padding for categories: 5% each side
  const horizontalPadding = useMemo(() => Math.round(width * 0.05), [width]);

  // columns (same logic as before)
  const numColumns = useMemo(
    () => (width > 600 ? 3 : width > 300 ? 3 : 2),
    [width],
  );

  // item width inside available area (exclude the 2 * horizontalPadding)
  const itemWidth = useMemo(() => {
    const columns = numColumns;
    const gapBetweenItems = 16; // same spacing as before between items
    const availableWidth = width - horizontalPadding * 2;
    return (availableWidth - gapBetweenItems * (columns + 1)) / columns;
  }, [width, numColumns, horizontalPadding]);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);
  const makeCall = () => {
    if (salon?.contact_info?.phone) {
      setShowConfirm(true);
    }
  };

  // NEW: confirm call action
  const confirmCall = () => {
    setShowConfirm(false);
    if (salon?.contact_info?.phone) {
      Linking.openURL(`tel:${salon.contact_info.phone}`);
    }
  };
  const openAddressMap = async (lat, lng, label) => {
    lat = salon?.location?.lat;
    lng = salon?.location?.lng;
    label = salon?.location?.address;
    console.log('lat: ', lat);
    console.log('lng: ', lng);
    console.log('label: ', label);

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
    } catch (error) {
      console.error('Error opening map:', error);
    }
  };

  const toggleFavorite = useCallback(async () => {
    if (!isAuth) {
      setAuthModal(true);
      return;
    }
    try {
      const res = isFav
        ? await deletefavorite(salonId)
        : await favorite(salonId);
      if (res) {
        // update both state and in-memory cache via setIsFav provided by hook
        setIsFav(!isFav);
      }
    } catch (err) {
      console.log('favorite toggle error', err);
    }
  }, [isAuth, isFav, setIsFav, salonId]);

  const handleService = useCallback(
    (uuid, CatName) => navigation.navigate('Service', {salonId, uuid, CatName}),
    [navigation, salonId],
  );

  const renderCategory = useCallback(
    ({item}) => (
      <CategoryItem
        item={item}
        onPress={handleService}
        isRTL={isRTL}
        itemWidth={itemWidth}
      />
    ),
    [handleService, isRTL, itemWidth],
  );

  // cached logo
  console.log('salon data for logoSource:', salon?.images?.logo);
  const logoSource =
    salon?.images?.logo &&
    salon?.images?.logo !==
      'https://dashboard.ontimeqa.com/backend/assets/images/default-salon-logo.png' &&
    salon?.images?.logo !== '/storage/0'
      ? {uri: `${hostImge}${salon.images.logo}`}
      : appLogo;

  // FlatList ref for nudging layout when cached loaded
  const flatRef = useRef(null);

  // When cached data is used, FlatList on iOS sometimes needs a layout nudge.
  // We call scrollToOffset inside requestAnimationFrame + a small timeout fallback.
  useEffect(() => {
    if (!cacheLoaded) {
      return;
    }
    // nudge only when categories list exists
    requestAnimationFrame(() => {
      try {
        flatRef.current?.scrollToOffset?.({offset: 0, animated: false});
      } catch (e) {
        // ignore
      }
    });
    // fallback (some iOS versions need an extra tick)
    const tm = setTimeout(() => {
      try {
        flatRef.current?.scrollToOffset?.({offset: 0, animated: false});
      } catch (e) {}
    }, 60);
    return () => clearTimeout(tm);
  }, [cacheLoaded]);

  // Header view for FlatList (salon info + ads)
  const ListHeader = useCallback(() => {
    return (
      <View>
        {/* keep salon info centered in 90% inner wrapper */}
        <View style={{width, alignItems: 'center'}}>
          <View style={{width: '90%'}}>
            <View style={styles.salonInfoWrap}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                }}>
                {logoSource ? (
                  <Image
                    source={logoSource}
                    style={styles.salonLogo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.salonLogo, styles.logoPlaceholder]} />
                )}

                <View
                  style={[
                    styles.salonDetails,
                    {
                      paddingLeft: 15,
                    },
                  ]}>
                  <View style={{flexDirection: 'row'}}>
                    <Text style={[styles.title]}>
                      {isRTL ? salon?.name_ar : salon?.name}
                    </Text>
                  </View>
                  <View style={{flexDirection: 'row'}}>
                    <Text style={[styles.description]}>
                      {isRTL ? salon?.description_ar : salon?.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.location,
                      {
                        flexDirection: 'row',
                      },
                    ]}>
                    <Ionicons
                      name="location"
                      size={15}
                      color={Colors.primary}
                    />
                    <View style={{flexDirection: 'row'}}>
                      <Text
                        style={[
                          styles.locationText,
                          isRTL && {marginLeft: 0, marginRight: 5},
                        ]}
                        numberOfLines={2}>
                        {salon?.location?.address}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={[styles.mapButtonContainer]}>
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={openAddressMap}>
                  <Text style={styles.mapButtonText}>{t('Google Map')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mapButton, styles.callButton]}
                  onPress={Platform.OS === 'ios' ? confirmCall : makeCall}>
                  <Text style={[styles.mapButtonText, styles.callButtonText]}>
                    {t('Call')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* full-width slider (AdSlider internally uses full width pages and 5px image padding) */}
        {Array.isArray(salon?.banners) && salon.banners.length > 0 ? (
          <View style={styles.adContainer}>
            <AdSlider paidAds={salon.banners} />
          </View>
        ) : (
          <View style={styles.separator} />
        )}
      </View>
    );
  }, [logoSource, salon, isRTL, width]);

  return (
    <SafeAreaView
      style={[styles.safeArea, {writingDirection: isRTL ? 'rtl' : 'ltr'}]}>
      <Header
        onBack={handleGoBack}
        onToggleFav={toggleFavorite}
        isFav={isFav}
        isRTL={isRTL}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        // --- FlatList is the top-level scroll container. No ScrollView.
        <FlatList
          ref={flatRef}
          data={categories}
          renderItem={renderCategory}
          keyExtractor={item =>
            item?.id ? String(item.id) : item?.uuid || Math.random().toString()
          }
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={[
            styles.categoriesContainer,
            {alignItems: 'center', paddingHorizontal: horizontalPadding},
          ]}
          style={styles.categoriesList}
          initialNumToRender={6}
          windowSize={9}
          // disable aggressive clipping to avoid issues during orientation/RTL changes
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListHeaderComponentStyle={{paddingBottom: 10}}
          ListEmptyComponent={
            <Text style={{textAlign: 'center', marginTop: 20}}>
              {t('No categories found')}
            </Text>
          }
          extraData={categories} // ensure re-render when categories change
        />
      )}

      <AuthModal
        visible={authModal}
        onClose={() => setAuthModal(false)}
        onLogin={() => navigation.navigate('Auth', {screen: 'LoginOrSignup'})}
      />
      <Modal
        transparent
        visible={showConfirm}
        onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>{t('Confirmation')}</Text>
            <Text style={styles.confirmText}>
              {t('Are you sure you want to call?')}
            </Text>
            <Text style={styles.confirmNumber}>
              {salon?.contact_info?.phone}
            </Text>

            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  {backgroundColor: Colors.primary},
                ]}
                onPress={confirmCall}>
                <Text style={styles.confirmButtonText}>{t('Call')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: '#C5AA96',
                  },
                ]}
                onPress={() => setShowConfirm(false)}>
                <Text style={[styles.confirmButtonText, {color: '#C5AA96'}]}>
                  {t('Cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBox: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  confirmText: {
    fontSize: 14,
    marginBottom: 8,
  },
  confirmNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    border: 1,
    borderColor: '#C5AA96',
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButtonText: {
    color: '#C5AA96',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  safeArea: {flex: 1, backgroundColor: '#fff'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    padding: 15,
    paddingHorizontal: 35,
  },
  salonInfoWrap: {
    flexDirection: 'column',
    marginTop: 10,
    padding: 15,
    gap: 15,
    alignItems: 'flex-start',
    position: 'relative',
  },
  salonLogo: {width: 75, height: 75, borderRadius: 35},
  logoPlaceholder: {backgroundColor: Colors.border},
  salonDetails: {flex: 1},
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 5,
  },
  description: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
    color: Colors.black3,
  },
  location: {
    flexWrap: 'wrap',
    maxWidth: '90%',
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 5,
  },
  mapButtonContainer: {flexDirection: 'row', gap: 10},
  mapButton: {
    minWidth: 113,
    height: 30,
    backgroundColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  callButton: {
    backgroundColor: 'transparent',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  mapButtonText: {color: '#fff', fontSize: 10},
  callButtonText: {color: Colors.primary, fontSize: 10},
  adContainer: {marginVertical: 20},
  separator: {
    borderWidth: 1,
    borderColor: Colors.border,
    height: 0,
    width: '90%',
    marginVertical: 15,
    alignSelf: 'center',
  },
  categoriesList: {width: '100%'}, // full width list so header/slider can be full width
  categoriesContainer: {justifyContent: 'space-around', paddingVertical: 10},
  categoryItem: {
    alignItems: 'center',
    margin: 15,
    padding: 8,
    justifyContent: 'space-around',
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 5,
  },
  modalContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    width: '80%',
    maxWidth: 350,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 25,
    textAlign: 'center',
  },
  loginButton: {
    minWidth: 110,
    height: 45,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  loginButtonText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  loadingWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});

export default SalonScreen;
