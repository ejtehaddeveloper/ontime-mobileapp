/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-native/no-inline-styles */
/*
  Booking Screen — deterministic pagination using pagesRef (stable while scrolling)
  - store each page separately, rebuild deterministic merged list from pages
  - dedupe by id (first-seen from page 1..N wins)
  - sort within page by _ts descending
*/

import React, {useCallback, useContext, useMemo, useRef, useState} from 'react';
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
import {t} from 'i18next';

const DEBUG = false; // set true to get detailed logs
const TABS = [
  {id: 1, name: 'Booked', name_ar: 'محجوز', status: ['pending', 'rescheduled']},
  {id: 2, name: 'Completed', name_ar: 'اكتمل', status: ['completed']},
  {id: 3, name: 'Cancelled', name_ar: 'ألغي', status: ['cancelled']},
];
const appLogo = require('../../assets/images/logo22.jpg');

function parseToTs(item) {
  if (!item) return 0;
  const tryParse = s => {
    if (!s) return NaN;
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) return parsed;
    return NaN;
  };

  if (item.created_at) {
    const p = tryParse(item.created_at);
    if (!isNaN(p)) return p;
  }

  if (item.date && item.start_time) {
    const combined = `${item.date} ${item.start_time}`;
    const p = tryParse(combined);
    if (!isNaN(p)) return p;
    try {
      const iso = `${item.date}T${item.start_time}`;
      const parsed = Date.parse(iso);
      if (!isNaN(parsed)) return parsed;
    } catch (e) {}
  }

  if (item.date) {
    const p = tryParse(item.date);
    if (!isNaN(p)) return p;
  }

  const idNum = Number(item.id);
  if (!isNaN(idNum)) return idNum;

  return 0;
}

function normalizeAndAttachTs(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(it => {
    const copy = {...it};
    copy._ts = parseToTs(it) || 0;
    return copy;
  });
}

function sortDescByTsThenId(arr) {
  return arr.slice().sort((a, b) => {
    if ((b._ts || 0) !== (a._ts || 0)) return (b._ts || 0) - (a._ts || 0);
    const idA = Number(a.id) || 0;
    const idB = Number(b.id) || 0;
    return idB - idA;
  });
}

// Rebuild merged list from pagesRef (1..maxPage), preserving page order, deduping by id (first-seen wins)
function rebuildFromPages(pagesRef) {
  const pages = pagesRef.current || {};
  const pageNumbers = Object.keys(pages)
    .map(n => Number(n))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b); // 1,2,3...
  const seen = new Set();
  const merged = [];
  for (const p of pageNumbers) {
    const arr = pages[p] || [];
    for (const it of arr) {
      const key = String(it.id);
      if (!seen.has(key)) {
        merged.push(it);
        seen.add(key);
      }
    }
  }
  return merged;
}

// Lightweight bookings hook using pagesRef
function useBookings(initialPage = 1) {
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);
  const setItemsState = useCallback(next => {
    setItems(prev => {
      const nextVal = typeof next === 'function' ? next(prev) : next;
      itemsRef.current = Array.isArray(nextVal) ? nextVal : [];
      return nextVal;
    });
  }, []);

  // pagesRef: { [pageNumber]: Array<normalized items> }
  const pagesRef = useRef({});
  const maxPageRef = useRef(initialPage);
  const fetchingPagesRef = useRef(new Set()); // pages currently being fetched

  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // fetch a page (can be called concurrently for different page numbers)
  const fetchPage = useCallback(
    async (pageToFetch = 1, replace = false) => {
      // prevent duplicate fetch for same page
      if (fetchingPagesRef.current.has(pageToFetch)) {
        if (DEBUG)
          console.log(
            '[BOOKINGS] fetch skipped (already fetching) page',
            pageToFetch,
          );
        return;
      }
      fetchingPagesRef.current.add(pageToFetch);
      if (pageToFetch === 1 && !replace) {
        setLoading(true);
      }
      try {
        const data = await getAppoint(pageToFetch);
        const arr = Array.isArray(data) ? data : [];
        const normalized = normalizeAndAttachTs(arr);
        // sort within page newest->oldest for stable page ordering
        const pageSorted = sortDescByTsThenId(normalized);

        // if page1 with replace:true we set pagesRef[1] = pageSorted
        if (replace && pageToFetch === 1) {
          // keep other pages intact: just update page 1 and rebuild
          pagesRef.current = {
            ...pagesRef.current,
            [1]: pageSorted,
          };
          // don't reset maxPageRef here; keep loaded older pages if present
          if (DEBUG) {
            console.log(
              '[BOOKINGS] page1 replace: count=',
              pageSorted.length,
              'existingPages=',
              Object.keys(pagesRef.current).length,
            );
          }
        } else {
          // regular set page
          pagesRef.current = {
            ...pagesRef.current,
            [pageToFetch]: pageSorted,
          };
          if (pageToFetch > (maxPageRef.current || 0)) {
            maxPageRef.current = pageToFetch;
          }
          if (DEBUG) {
            console.log(
              '[BOOKINGS] stored page',
              pageToFetch,
              'count=',
              pageSorted.length,
            );
          }
        }

        // rebuild deterministic merged list from pages (1..max)
        const merged = rebuildFromPages(pagesRef);
        setItemsState(merged);

        setHasMore(arr.length > 0);
        setPage(prev => (pageToFetch > prev ? pageToFetch : prev));
        if (DEBUG) {
          console.log(
            `[BOOKINGS] after storing page ${pageToFetch} => merged count=${merged.length}`,
          );
          if (merged.length) {
            console.log(
              'first5:',
              merged.slice(0, 5).map(it => ({id: it.id, _ts: it._ts})),
            );
          }
        }
      } catch (err) {
        console.log('useBookings fetch error', err);
      } finally {
        fetchingPagesRef.current.delete(pageToFetch);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setItemsState],
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    // page1 replace (but rebuild keeps other pages unless you want to wipe them)
    fetchPage(1, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    // compute next page based on pagesRef keys
    const keys = Object.keys(pagesRef.current || {})
      .map(n => Number(n))
      .filter(n => !isNaN(n));
    const nextPage = keys.length ? Math.max(...keys) + 1 : initialPage + 1;
    if (fetchingPagesRef.current.has(nextPage)) return;
    if (!hasMore) return;
    fetchPage(nextPage, false);
  }, [fetchPage, hasMore, initialPage]);

  return {
    items,
    loading,
    refreshing,
    fetchPage,
    refresh,
    loadMore,
    hasMore,
    setItems: setItemsState,
    pagesRef, // exported for debugging if needed
  };
}

// small components
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

const StatusBadge = ({status}) => {
  const map = {
    pending: {label: 'Pending', color: '#F6C84C'},
    rescheduled: {label: 'Rescheduled', color: '#4C9BF6'},
    completed: {label: 'Completed', color: '#4CAF50'},
    cancelled: {label: 'Cancelled', color: '#E04F5F'},
  };
  const s = map[status] || {label: status || '', color: Colors.primary};
  return (
    <View style={[styles.badge, {backgroundColor: s.color}]}>
      <Text style={styles.badgeText}>
        {i18n.language === 'ar' ? s.label : s.label}
      </Text>
    </View>
  );
};

const BookingCard = React.memo(({item, onPress, formatTime, formatDate}) => {
  const logoUrl = item?.salon?.images?.logo;
  const hasLogo =
    !!logoUrl &&
    logoUrl !==
      'https://dashboard.ontimeqa.com/backend/assets/images/1300x300.png';
  const logoUri = hasLogo ? {uri: logoUrl, cache: 'force-cache'} : appLogo;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.85}>
      <View style={styles.cardLeft}>
        <Image source={logoUri} style={styles.avatar} />
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
        <StatusBadge status={item?.status} />
        <View style={{height: 8}} />
        <View style={styles.detailPill}>
          <Text style={styles.detailPillText}>{i18n.t('Detail')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

function formatTimeTo12Hour(time24) {
  if (!time24) return '';
  const [hrs, mins] = time24.split(':');
  let hour = parseInt(hrs, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${mins} ${ampm}`;
}
function formatDateShort(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const options = {weekday: 'short', day: 'numeric', month: 'short'};
    return new Intl.DateTimeFormat(
      i18n.language === 'ar' ? 'ar-EG' : 'en-US',
      options,
    ).format(date);
  } catch (e) {
    return dateString;
  }
}

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
    pagesRef,
  } = useBookings(1);

  const flatListRef = useRef(null);
  const onEndReachedCalledDuringMomentum = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!isAuth) {
        navigation.dispatch(
          CommonActions.reset({index: 0, routes: [{name: 'Auth'}]}),
        );
        return;
      }
      // initial load: fetch page1 (and allow subsequent loadMore to fetch more)
      fetchPage(1, true);
    }, [isAuth, navigation, fetchPage]),
  );

  const filterTab = useMemo(
    () => TABS.find(tp => tp.id === tabSelected),
    [tabSelected],
  );

  // filter preserves page order because `items` is already deterministic
  const filteredBookings = useMemo(
    () =>
      Array.isArray(items)
        ? items.filter(it => filterTab.status.includes(it?.status))
        : [],
    [items, filterTab],
  );

  const handleBookingDetails = useCallback(
    id => navigation.navigate('BookingDetails', {id}),
    [navigation],
  );

  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) {
      loadMore();
    }
  }, [loading, hasMore, loadMore]);

  const handleTabSelect = useCallback(
    id => {
      setTabSelected(id);
      try {
        flatListRef.current?.scrollToOffset({offset: 0, animated: true});
      } catch (e) {}
      // fetch page1 for this tab (smart: pagesRef preserves older pages unless you want to clear them)
      fetchPage(1, true);
    },
    [fetchPage],
  );

  // debug helper (optional)
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(
      '[BOOKING SCREEN] pages present:',
      Object.keys(pagesRef.current || {}),
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('Bookings')}</Text>
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
              if (!onEndReachedCalledDuringMomentum.current) return;
              handleEndReached();
              onEndReachedCalledDuringMomentum.current = false;
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
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    resizeMode: 'cover',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMiddle: {flex: 1, justifyContent: 'center'},
  cardTitle: {fontSize: 15, fontWeight: '600', color: Colors.black1},
  rowSmall: {flexDirection: 'row', alignItems: 'center', marginTop: 6},
  muted: {fontSize: 13, color: '#8a8a8a'},
  cardRight: {alignItems: 'flex-end', justifyContent: 'center'},
  badge: {paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999},
  badgeText: {fontSize: 11, color: '#fff', fontWeight: '600'},
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
