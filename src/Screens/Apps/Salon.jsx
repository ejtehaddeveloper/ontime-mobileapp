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

// -------- in-memory cache (module-scoped) --------
// Keyed by salonId; values: { salon, categories, isFav, lastFetchedAt(optional) }
const salonCache = new Map();

// --- svg cache & SvgImage component (same as before)
const svgCache = new Map();
const SvgImage = React.memo(({imageUrl, width = 80, height = 80}) => {
  const [xml, setXml] = useState(
    () => (imageUrl && svgCache.get(imageUrl)) || null,
  );
  useEffect(() => {
    let mounted = true;
    if (!imageUrl) return;
    const cached = svgCache.get(imageUrl);
    if (cached) {
      setXml(cached);
      return;
    }
    fetch(imageUrl)
      .then(res => res.text())
      .then(text => {
        if (!mounted) return;
        svgCache.set(imageUrl, text);
        setXml(text);
      })
      .catch(err => {
        console.log('Svg fetch error', err);
      });
    return () => (mounted = false);
  }, [imageUrl]);

  if (!xml) return null;
  return <SvgXml xml={xml} width={width} height={height} />;
});

// --- Header component
const Header = React.memo(({onBack, onToggleFav, isFav, isRTL}) => {
  return (
    <View style={styles.header}>
      <Ionicons
        name={isRTL ? 'arrow-forward' : 'arrow-back'}
        size={25}
        onPress={onBack}
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

// --- Category item
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

// --- Auth modal
const AuthModal = ({visible, onClose, onLogin}) => {
  if (!visible) return null;
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
  if (!Array.isArray(a) || !Array.isArray(b)) return true;
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (String(a[i]?.id) !== String(b[i]?.id)) return true;
  }
  return false;
};

// --- data hook using in-memory cache (no persistence) ---
function useSalonDataWithCache(salonId, isAuth) {
  const [salon, setSalon] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(true);

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
      }

      // background fetch to confirm latest data; only update if changed
      Promise.all([
        getSalons(salonId),
        getCategory(salonId),
        isAuth ? IFfavorite(salonId) : Promise.resolve({is_favorite: false}),
      ])
        .then(([s, c, f]) => {
          if (cancelled || !mountedRef.current) return;
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
        if (cancelled || !mountedRef.current) return;
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
        }
      })
      .catch(err => {
        console.log('useSalonData initial fetch error', err);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [salonId, isAuth]);

  // expose setter for isFav so toggleFavorite can update cache + state
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

  return {salon, categories, isFav, setIsFav: setIsFavAndCache, loading};
}

// --- Main screen
const SalonScreen = ({route}) => {
  const {salonId} = route.params;
  const {width} = useWindowDimensions();
  const isRTL = i18n.language === 'ar';
  const navigation = useNavigation();
  const {isAuth} = React.useContext(AuthContext);

  const {salon, categories, isFav, setIsFav, loading} = useSalonDataWithCache(
    salonId,
    isAuth,
  );
  const [authModal, setAuthModal] = useState(false);

  const numColumns = useMemo(
    () => (width > 600 ? 3 : width > 300 ? 3 : 2),
    [width],
  );
  const itemWidth = useMemo(() => {
    const columns = numColumns;
    const padding = 16;
    return (width * 0.8 - padding * (columns + 1)) / columns;
  }, [width, numColumns]);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const openMap = useCallback(() => {
    if (!salon?.location?.address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      salon.location.address,
    )}`;
    Linking.openURL(url);
  }, [salon]);

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
  const logoSource = salon?.images?.logo
    ? {uri: `${hostImge}${salon.images.logo}`, cache: 'force-cache'}
    : null;

  // Header view for FlatList (salon info + ads)
  const ListHeader = useCallback(() => {
    return (
      <View>
        <View style={styles.salonInfoWrap}>
          {logoSource ? (
            <Image
              source={logoSource}
              style={styles.salonLogo}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.salonLogo, styles.logoPlaceholder]} />
          )}

          <View style={styles.salonDetails}>
            <Text style={styles.title}>
              {isRTL ? salon?.name_ar : salon?.name}
            </Text>
            <Text style={styles.description}>
              {isRTL ? salon?.description_ar : salon?.description}
            </Text>
            <View
              style={[
                styles.location,
                isRTL && {flexDirection: 'row-reverse'},
              ]}>
              <Ionicons name="location" size={15} color={Colors.primary} />
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

          <View
            style={[
              styles.mapButtonContainer,
              isRTL && {left: 15, right: 'auto'},
            ]}>
            <TouchableOpacity style={styles.mapButton} onPress={openMap}>
              <Text style={styles.mapButtonText}>{t('Google Map')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {Array.isArray(salon?.banners) && salon.banners.length > 0 ? (
          <View style={styles.adContainer}>
            <AdSlider paidAds={salon.banners} />
          </View>
        ) : (
          <View style={styles.separator} />
        )}
      </View>
    );
  }, [logoSource, salon, isRTL, openMap]);

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
          data={categories}
          renderItem={renderCategory}
          keyExtractor={item =>
            item?.id ? String(item.id) : item?.uuid || Math.random().toString()
          }
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesList}
          initialNumToRender={6}
          windowSize={9}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListHeaderComponentStyle={{paddingBottom: 10}}
          ListEmptyComponent={
            <Text style={{textAlign: 'center', marginTop: 20}}>
              {t('No categories found')}
            </Text>
          }
        />
      )}

      <AuthModal
        visible={authModal}
        onClose={() => setAuthModal(false)}
        onLogin={() => navigation.navigate('Auth', {screen: 'LoginOrSignup'})}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#fff'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    paddingHorizontal: 35,
    alignItems: 'center',
  },
  salonInfoWrap: {
    flexDirection: 'row',
    marginTop: 10,
    padding: 15,
    alignItems: 'center',
    position: 'relative',
  },
  salonLogo: {width: 75, height: 75, borderRadius: 50},
  logoPlaceholder: {backgroundColor: Colors.border},
  salonDetails: {flex: 1, paddingHorizontal: 15},
  title: {fontSize: 18, fontWeight: '700', marginBottom: 10},
  description: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
    color: Colors.black3,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    maxWidth: '90%',
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 5,
    flex: 1,
  },
  mapButtonContainer: {
    position: 'absolute',
    alignSelf: 'flex-end',
    bottom: 5,
    right: 15,
  },
  mapButton: {
    minWidth: 113,
    height: 27,
    backgroundColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  mapButtonText: {color: '#fff', fontSize: 10},
  adContainer: {marginVertical: 20},
  separator: {
    borderWidth: 1,
    borderColor: Colors.border,
    height: 0,
    width: '90%',
    marginVertical: 15,
    alignSelf: 'center',
  },
  categoriesList: {alignSelf: 'center', width: '90%'},
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
