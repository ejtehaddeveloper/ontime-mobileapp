/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  memo,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors} from '../../assets/constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AuthContext} from '../../context/AuthContext';
import {
  CommonActions,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import {deletefavorite, getfavorite} from '../../context/api';
import Loading from '../../assets/common/Loading';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';
import {screenHeight} from '../../assets/constants/ScreenSize';
import hostImge from '../../context/hostImge';

/**
 * Favorites screen with AsyncStorage persistence.
 * Cache key versioned so you can change it if shape changes in future.
 */
const CACHE_KEY = 'favorites_cache_v1';

// memoized row to avoid re-rendering unchanged rows
const FavoriteRow = memo(({item, onPressCard, onPressHeart}) => {
  const slug = item.slug;
  const number = slug?.match(/\d+$/);
  const extractedNumber = number ? number[0] : null;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPressCard(extractedNumber)}>
      <View style={styles.cardContent}>
        {item?.images?.logo ? (
          <Image
            source={{uri: `${hostImge}${item?.images?.logo}`}}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="cut" size={26} color={Colors.primary} />
          </View>
        )}
        <View style={{flex: 1, justifyContent: 'center'}}>
          <Text style={styles.name} numberOfLines={1}>
            {i18n.language === 'ar' ? item?.name_ar : item?.name}
          </Text>
          <Text style={styles.subText}>{t('Beauty & Wellness')}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => onPressHeart(item?.id)}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
        <Ionicons name="heart" size={26} color={Colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const Favorites = () => {
  const {isAuth} = useContext(AuthContext);
  const navigation = useNavigation();

  const [favorite, setFavorite] = useState([]);
  const dataRef = useRef([]); // canonical list to avoid unnecessary setState
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // helper: compare two arrays of items by ID (order + content)
  const isDifferentList = useCallback((a = [], b = []) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return true;
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) {
      if (String(a[i]?.id) !== String(b[i]?.id)) return true;
    }
    return false;
  }, []);

  // persist canonical list to AsyncStorage
  const persistCache = useCallback(async list => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list ?? []));
    } catch (err) {
      console.log('Error saving favorites cache', err);
    }
  }, []);

  // load cache (if exists)
  const loadCache = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          dataRef.current = parsed;
          setFavorite(parsed);
          setLoading(false); // show cached immediately
        }
      }
    } catch (err) {
      console.log('Error reading favorites cache', err);
    }
  }, []);

  // fetch favorites from server and update only when changed (or forced)
  const fetchData = useCallback(
    async (options = {forceReplace: false}) => {
      try {
        const Data = await getfavorite(); // expected array
        const incoming = Array.isArray(Data) ? Data : [];

        if (options.forceReplace || dataRef.current.length === 0) {
          // first load or forced replace (e.g., user refresh)
          dataRef.current = incoming;
          setFavorite(incoming);
          await persistCache(incoming);
        } else {
          // lightweight check: update state only if array differs by ids
          if (isDifferentList(dataRef.current, incoming)) {
            dataRef.current = incoming;
            setFavorite(incoming);
            await persistCache(incoming);
          }
          // otherwise do nothing (prevents unnecessary re-render)
        }
      } catch (error) {
        console.log('Error fetching data:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [isDifferentList, persistCache],
  );

  // run on screen focus
  useFocusEffect(
    useCallback(() => {
      if (!isAuth) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{name: 'Auth'}],
          }),
        );
        return;
      }

      // If we have cached data, load it immediately (fast) then fetch in background.
      // If no cached data, force an initial fetch (show loader).
      (async () => {
        if (dataRef.current.length === 0) {
          // attempt to load from storage first
          await loadCache();
          if (dataRef.current.length === 0) {
            // still empty -> do full fetch and show loading indicator
            setLoading(true);
            await fetchData({forceReplace: true});
          } else {
            // we had cached items -> background check for changes (no loading spinner)
            fetchData({forceReplace: false});
          }
        } else {
          // we already have data in memory -> lightweight check for changes
          fetchData({forceReplace: false});
        }
      })();
    }, [isAuth, navigation, fetchData, loadCache]),
  );

  // remove favorite: optimistic update locally, persist cache
  const heart = useCallback(
    async id => {
      try {
        const response = await deletefavorite(id);
        if (response) {
          // remove from canonical list
          const updated = dataRef.current.filter(
            item => String(item.id) !== String(id),
          );
          dataRef.current = updated;
          setFavorite(updated);
          await persistCache(updated);
        }
      } catch (error) {
        console.log('Favorite error', error);
      }
    },
    [persistCache],
  );

  const handleRefresh = useCallback(() => {
    setLoading(true);
    // force replace on user-initiated refresh
    fetchData({forceReplace: true});
  }, [fetchData]);

  const handleGoSalon = useCallback(
    salonId => {
      navigation.navigate('Salon', {salonId});
    },
    [navigation],
  );

  // memoized renderItem to avoid recreating on each render
  const renderItem = useCallback(
    ({item}) => (
      <FavoriteRow
        item={item}
        onPressCard={handleGoSalon}
        onPressHeart={heart}
      />
    ),
    [handleGoSalon, heart],
  );

  // initial mount: if cache exists it will be loaded by focus effect; keep this to ensure load when component mounts outside focus
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw && dataRef.current.length === 0) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            dataRef.current = parsed;
            setFavorite(parsed);
            setLoading(false);
            // background refresh to confirm latest
            fetchData({forceReplace: false});
            return;
          }
        }
        // if no cache, initial fetch
        if (dataRef.current.length === 0) {
          setLoading(true);
          fetchData({forceReplace: true});
        }
      } catch (err) {
        console.log('Initial cache read error', err);
        setLoading(true);
        fetchData({forceReplace: true});
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>{t('Favorites')}</Text>
      </View>

      {loading ? (
        <Loading />
      ) : favorite?.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="heart-dislike-outline"
            size={64}
            color={Colors.primary}
            style={{marginBottom: 16}}
          />
          <Text style={styles.emptyText}>
            {t("You don't have any favorites yet")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorite}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          refreshing={loading}
          onRefresh={handleRefresh}
          ListFooterComponent={
            loadingMore ? <Text>{t('Loading...')}</Text> : null
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  headerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  listContainer: {
    padding: 12,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 3.5,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 14,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 2,
  },
  subText: {
    fontSize: 13,
    color: Colors.black3,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: screenHeight * 0.18,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: Colors.black3,
    lineHeight: 22,
  },
});

export default Favorites;
