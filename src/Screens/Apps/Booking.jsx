/* Simplified Booking Screen (React Native)
   - Removed debug noise and unused imports
   - Kept paging + simple prefetch (safe cap)
   - Small inline comments for clarity
*/

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  useContext,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  useNavigation,
  CommonActions,
  useFocusEffect,
} from '@react-navigation/native';
import {AuthContext} from '../../context/AuthContext';
import {getAppoint} from '../../context/api';
import {Colors} from '../../assets/constants';
import i18n from '../../assets/locales/i18';
import {screenHeight} from '../../assets/constants/ScreenSize';

const MAX_PREFETCH = 5; // safe cap for fallback prefetch
const appLogo = require('../../assets/images/logoem.png');

const TABS = [
  {
    id: 1,
    name: 'Booked',
    name_ar: 'محجوز',
    status: ['pending', 'rescheduled', 'confirmed'],
  },
  {id: 2, name: 'Completed', name_ar: 'اكتمل', status: ['completed']},
  {id: 3, name: 'Cancelled', name_ar: 'ألغي', status: ['cancelled']},
];

// --- small utility helpers ---
const parseToTs = item => {
  if (!item) return 0;
  // Prefer created_at then date+time, then date, finally fall back to numeric id
  if (item.created_at) {
    const t = Date.parse(item.created_at);
    if (!isNaN(t)) return t;
  }
  if (item.date && item.start_time) {
    const t = Date.parse(`${item.date}T${item.start_time}`);
    if (!isNaN(t)) return t;
  }
  if (item.date) {
    const t = Date.parse(item.date);
    if (!isNaN(t)) return t;
  }
  const idNum = Number(item.id);
  return isNaN(idNum) ? 0 : idNum;
};

const normalizeAndAttachTs = arr =>
  Array.isArray(arr) ? arr.map(it => ({...it, _ts: parseToTs(it) || 0})) : [];

const sortDescByTsThenId = arr =>
  arr.slice().sort((a, b) => {
    if ((b._ts || 0) !== (a._ts || 0)) {
      return (b._ts || 0) - (a._ts || 0);
    }
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });

// Merge cached pages keeping the freshest entry per id
const rebuildFromPages = pagesRef => {
  const pages = pagesRef.current || {};
  const map = new Map();
  Object.values(pages).forEach(arr => {
    (arr || []).forEach(it => {
      const key = String(it.id);
      const existing = map.get(key);
      if (!existing || (it._ts || 0) > (existing._ts || 0)) map.set(key, it);
    });
  });
  return sortDescByTsThenId(Array.from(map.values()));
};

// --- hook to manage bookings (paging + cache) ---
function useBookings() {
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);
  const setItemsState = useCallback(next => {
    const nextVal = typeof next === 'function' ? next(itemsRef.current) : next;
    itemsRef.current = Array.isArray(nextVal) ? nextVal : [];
    setItems(nextVal);
  }, []);

  const pagesRef = useRef({});
  const lastPageRef = useRef(1);
  const fetchingPagesRef = useRef(new Set());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // fetch a single page and update cache
  const fetchPage = useCallback(
    async (page = 1, replace = false, suppressPrefetch = false) => {
      if (fetchingPagesRef.current.has(page)) return; // already fetching
      fetchingPagesRef.current.add(page);
      if (page === 1 && itemsRef.current.length === 0) setLoading(true);

      try {
        const resp = await getAppoint(page);
        const arr = Array.isArray(resp) ? resp : resp?.data || [];
        const pagination = resp?.pagination || null;
        if (pagination && typeof pagination.last_page === 'number')
          lastPageRef.current = pagination.last_page;

        const normalized = sortDescByTsThenId(normalizeAndAttachTs(arr));

        // store page (replace page1 when requested)
        pagesRef.current = {...pagesRef.current, [page]: normalized};
        if (replace && page === 1) pagesRef.current[1] = normalized;

        // rebuild merged list and update state
        setItemsState(rebuildFromPages(pagesRef));

        // update hasMore
        if (pagination)
          setHasMore(pagination.current_page < pagination.last_page);
        else setHasMore(arr.length > 0);

        // Simple prefetch: when we refreshed page1, try to prefetch subsequent pages (bounded)
        if (!suppressPrefetch && replace && page === 1) {
          const last = pagination?.last_page || 1;
          const prefetchEnd = pagination
            ? Math.min(last, 1 + MAX_PREFETCH)
            : 1 + MAX_PREFETCH;
          for (let p = 2; p <= prefetchEnd; p++) {
            if (!pagesRef.current[p] && !fetchingPagesRef.current.has(p)) {
              fetchPage(p, false, true).catch(() => {}); // fire-and-forget
            }
          }
        }
      } catch (e) {
        console.warn('useBookings fetch error', e);
      } finally {
        fetchingPagesRef.current.delete(page);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setItemsState],
  );

  // update an item across cached pages (or insert into page1)
  const updateItemInPages = useCallback(
    updated => {
      if (!updated || updated.id == null) return;
      const norm = normalizeAndAttachTs([updated])[0];
      const pages = {...pagesRef.current};
      let changed = false;

      Object.keys(pages).forEach(pn => {
        const arr = pages[pn] || [];
        const i = arr.findIndex(it => String(it.id) === String(norm.id));
        if (i !== -1) {
          arr[i] = {...arr[i], ...norm};
          pages[pn] = sortDescByTsThenId(arr);
          changed = true;
        }
      });

      if (!changed) {
        pages[1] = pages[1] ? sortDescByTsThenId([norm, ...pages[1]]) : [norm];
        changed = true;
      }

      if (changed) {
        pagesRef.current = pages;
        setItemsState(rebuildFromPages(pagesRef));
      }
    },
    [setItemsState],
  );

  // remove item from all cached pages
  const removeItemFromPages = useCallback(
    id => {
      if (id == null) return;
      const pages = {...pagesRef.current};
      let changed = false;
      Object.keys(pages).forEach(pn => {
        const arr = pages[pn] || [];
        const filtered = arr.filter(it => String(it.id) !== String(id));
        if (filtered.length !== arr.length) {
          pages[pn] = filtered;
          changed = true;
        }
      });
      if (changed) {
        pagesRef.current = pages;
        setItemsState(rebuildFromPages(pagesRef));
      }
    },
    [setItemsState],
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    const keys = Object.keys(pagesRef.current || {})
      .map(n => Number(n))
      .filter(n => !isNaN(n));
    const nextPage = keys.length ? Math.max(...keys) + 1 : 2;
    if (fetchingPagesRef.current.has(nextPage) || !hasMore) return;
    fetchPage(nextPage, false);
  }, [fetchPage, hasMore]);

  return {
    items,
    loading,
    refreshing,
    fetchPage,
    refresh,
    loadMore,
    hasMore,
    pagesRef,
    updateItemInPages,
    removeItemFromPages,
  };
}

// --- UI components ---
const TabBar = React.memo(({selectedId, onSelect}) => (
  <View style={styles.tabWrap}>
    {TABS.map(tab => {
      const active = tab.id === selectedId;
      return (
        <TouchableOpacity
          key={tab.id}
          onPress={() => onSelect(tab.id)}
          style={active ? styles.tabActive : styles.tab}
          accessibilityRole="button">
          <Text style={active ? styles.tabActiveText : styles.tabText}>
            {i18n.language === 'ar' ? tab.name_ar : tab.name}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
));

const BookingCard = React.memo(({item, onPress, formatTime, formatDate}) => {
  const logoUrl = item?.salon?.images?.logo;
  const hasLogo = !!logoUrl && !logoUrl.includes('1300x300.png');
  const logoSource = hasLogo ? {uri: logoUrl} : appLogo;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.85}>
      <View style={styles.cardLeft}>
        <Image source={logoSource} style={styles.avatar} />
      </View>
      <View style={styles.cardMiddle}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {i18n.language === 'ar' ? item?.salon?.name_ar : item?.salon?.name}
        </Text>
        <View style={styles.rowSmall}>
          <Text style={styles.muted}>{formatTime(item?.start_time)}</Text>
          <Text style={styles.muted}> • </Text>
          <Text style={styles.muted}>{formatDate(item?.date)}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={styles.detailPill}>
          <Text style={styles.detailPillText}>{i18n.t('Details')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Simple formatters
const formatTimeTo12Hour = time => {
  if (!time) return '';
  const [hh, mm] = String(time).split(':');
  let h = parseInt(hh, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mm} ${ampm}`;
};

const formatDateShort = dateString => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const opts = {weekday: 'long', day: 'numeric', month: 'short'};
    return new Intl.DateTimeFormat(
      i18n.language === 'ar' ? 'ar-EG' : 'en-US',
      opts,
    ).format(date);
  } catch (e) {
    return dateString;
  }
};

// --- Main screen ---
const Booking = () => {
  const navigation = useNavigation();
  const {isAuth} = useContext(AuthContext);
  const [tabSelected, setTabSelected] = useState(1);

  const {
    items,
    loading,
    refreshing,
    fetchPage,
    refresh,
    loadMore,
    hasMore,
    updateItemInPages,
    removeItemFromPages,
  } = useBookings();

  const flatListRef = useRef(null);
  const onEndReachedCalledDuringMomentum = useRef(false);

  // redirect to Auth if not authenticated
  useFocusEffect(
    useCallback(() => {
      if (!isAuth) {
        navigation.dispatch(
          CommonActions.reset({index: 0, routes: [{name: 'Auth'}]}),
        );
        return;
      }
      fetchPage(1, true);
    }, [isAuth, navigation, fetchPage]),
  );

  const filterTab = useMemo(
    () => TABS.find(t => t.id === tabSelected),
    [tabSelected],
  );
  const filteredBookings = useMemo(
    () =>
      Array.isArray(items)
        ? items.filter(it => filterTab.status.includes(it?.status))
        : [],
    [items, filterTab],
  );

  const handleBookingDetails = useCallback(
    id =>
      navigation.navigate('BookingDetails', {
        id,
        updateItemInPages,
        removeItemFromPages,
      }),
    [navigation, updateItemInPages, removeItemFromPages],
  );

  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) loadMore();
  }, [loading, hasMore, loadMore]);

  const handleTabSelect = useCallback(
    id => {
      setTabSelected(id);
      flatListRef.current?.scrollToOffset({offset: 0, animated: true});
      fetchPage(1, true);
    },
    [fetchPage],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{i18n.t('Bookings')}</Text>
      </View>
      <View style={styles.content}>
        <TabBar selectedId={tabSelected} onSelect={handleTabSelect} />

        {loading && items.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredBookings}
            keyExtractor={item => String(item.id)}
            renderItem={({item}) => (
              <BookingCard
                item={item}
                onPress={handleBookingDetails}
                formatTime={formatTimeTo12Hour}
                formatDate={formatDateShort}
              />
            )}
            contentContainerStyle={styles.listContent}
            onEndReached={() => {
              if (onEndReachedCalledDuringMomentum.current) {
                handleEndReached();
                onEndReachedCalledDuringMomentum.current = false;
              }
            }}
            onEndReachedThreshold={0.4}
            onMomentumScrollBegin={() => {
              onEndReachedCalledDuringMomentum.current = true;
            }}
            ListFooterComponent={() =>
              loading && hasMore ? (
                <ActivityIndicator style={{margin: 12}} />
              ) : null
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} />
            }
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            windowSize={10}
            removeClippedSubviews={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F9',
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
    paddingTop: screenHeight * 0.03,
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
    marginTop: Platform.OS === 'ios' ? 20 : 0,
  },
  title: {fontSize: 20, fontWeight: '700', color: Colors.black1},
  content: {flex: 1, overflow: 'visible'},
  tabWrap: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEFF2',
    marginBottom: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginHorizontal: 6,
  },
  tabText: {fontSize: 13, color: Colors.primary},
  tabActive: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginHorizontal: 6,
    backgroundColor: Colors.primary,
  },
  tabActiveText: {fontSize: 13, color: '#fff'},
  listContent: {paddingTop: 10},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: Platform.OS === 'ios' ? 0.06 : 0.12,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  cardLeft: {marginRight: 12},
  avatar: {width: 64, height: 64, borderRadius: 32, resizeMode: 'cover'},
  cardMiddle: {flex: 1, justifyContent: 'center'},
  cardTitle: {fontSize: 15, fontWeight: '600', color: Colors.black1},
  rowSmall: {flexDirection: 'row', alignItems: 'center', marginTop: 6},
  muted: {fontSize: 13, color: '#8a8a8a'},
  cardRight: {alignItems: 'flex-end', justifyContent: 'center'},
  detailPill: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  detailPillText: {fontSize: 12, color: Colors.primary, fontWeight: '600'},
  center: {alignItems: 'center', justifyContent: 'center', padding: 24},
});

export default Booking;
