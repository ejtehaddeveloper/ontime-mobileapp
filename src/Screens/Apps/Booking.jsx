/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-native/no-inline-styles */
/*
  Booking Screen — added robust fallback prefetch for page1-replace when pagination missing
  - merge pages by id keeping freshest (_ts)
  - when page1 replace occurs, prefetch ALL pages 2..last_page if pagination exists
    otherwise fall back to sequential prefetch up to MAX_PREFETCH pages (safe cap)
  - exposes forceFetchAllPages for testing and updateItemInPages/removeItemFromPages for detail screens
*/

import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
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
import {t} from 'i18next';

const DEBUG = false;
const MAX_PREFETCH = 5;
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

function parseToTs(item) {
  if (!item) {
    return 0;
  }
  const tryParse = s => {
    if (!s) {
      return NaN;
    }
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) {
      return parsed;
    }
    return NaN;
  };

  if (item.created_at) {
    const p = tryParse(item.created_at);
    if (!isNaN(p)) {
      return p;
    }
  }

  if (item.date && item.start_time) {
    const combined = `${item.date} ${item.start_time}`;
    const p = tryParse(combined);
    if (!isNaN(p)) {
      return p;
    }
    try {
      const iso = `${item.date}T${item.start_time}`;
      const parsed = Date.parse(iso);
      if (!isNaN(parsed)) {
        return parsed;
      }
    } catch (e) {}
  }

  if (item.date) {
    const p = tryParse(item.date);
    if (!isNaN(p)) {
      return p;
    }
  }

  const idNum = Number(item.id);
  if (!isNaN(idNum)) {
    return idNum;
  }

  return 0;
}

function normalizeAndAttachTs(arr) {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.map(it => {
    const copy = {...it};
    copy._ts = parseToTs(it) || 0;
    return copy;
  });
}

function sortDescByTsThenId(arr) {
  return arr.slice().sort((a, b) => {
    if ((b._ts || 0) !== (a._ts || 0)) {
      return (b._ts || 0) - (a._ts || 0);
    }
    const idA = Number(a.id) || 0;
    const idB = Number(b.id) || 0;
    return idB - idA;
  });
}

// Rebuild merged list from pagesRef by picking the freshest version per id, then sort globally
function rebuildFromPages(pagesRef) {
  const pages = pagesRef.current || {};
  const map = new Map();

  Object.keys(pages).forEach(pn => {
    const arr = pages[pn] || [];
    for (const it of arr) {
      const key = String(it.id);
      const exist = map.get(key);
      if (!exist || (it._ts || 0) > (exist._ts || 0)) {
        map.set(key, it);
      }
    }
  });

  const merged = Array.from(map.values()).sort((a, b) => {
    const ta = a._ts || 0;
    const tb = b._ts || 0;
    if (tb !== ta) {
      return tb - ta;
    }
    const idA = Number(a.id) || 0;
    const idB = Number(b.id) || 0;
    return idB - idA;
  });

  return merged;
}

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

  const pagesRef = useRef({});
  const lastPageRef = useRef(1);
  const fetchingPagesRef = useRef(new Set());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // fetch a page (supports API returning {data:[],pagination:{}} or direct array)
  // suppressPrefetch prevents the caller from triggering prefetch logic again (used in fallback).
  const fetchPage = useCallback(
    async (pageToFetch = 1, replace = false, suppressPrefetch = false) => {
      if (fetchingPagesRef.current.has(pageToFetch)) {
        if (DEBUG) {
          console.log('[BOOKINGS] skip fetch (already fetching)', pageToFetch);
        }
        return;
      }
      fetchingPagesRef.current.add(pageToFetch);
      if (pageToFetch === 1 && itemsRef.current.length === 0) {
        setLoading(true);
      }

      try {
        const resp = await getAppoint(pageToFetch);
        if (DEBUG) {
          console.log(
            '[BOOKINGS] raw resp for page',
            pageToFetch,
            resp && typeof resp,
          );
        }
        const arr = Array.isArray(resp) ? resp : resp?.data || [];
        const pagination = resp?.pagination || null;
        if (pagination && typeof pagination.last_page === 'number') {
          lastPageRef.current = pagination.last_page;
        }

        const normalized = normalizeAndAttachTs(arr);
        const pageSorted = sortDescByTsThenId(normalized);

        if (replace && pageToFetch === 1) {
          // update only page1; keep other pages intact
          pagesRef.current = {
            ...pagesRef.current,
            [1]: pageSorted,
          };
          if (DEBUG) {
            console.log(
              '[BOOKINGS] replace page1 stored, count=',
              pageSorted.length,
            );
          }
        } else {
          pagesRef.current = {
            ...pagesRef.current,
            [pageToFetch]: pageSorted,
          };
          if (DEBUG) {
            console.log(
              '[BOOKINGS] stored page',
              pageToFetch,
              'count=',
              pageSorted.length,
            );
          }
        }

        // rebuild merged list and expose it
        const merged = rebuildFromPages(pagesRef);
        setItemsState(merged);

        // hasMore: if pagination present, check current_page < last_page
        if (pagination) {
          setHasMore(pagination.current_page < pagination.last_page);
        } else {
          setHasMore(arr.length > 0);
        }

        if (DEBUG) {
          console.log('[BOOKINGS] merged count=', merged.length);
          console.log(
            '[BOOKINGS] merged ids:',
            merged.map(it => `${it.id}:${it.status}:${it._ts}`).slice(0, 40),
          );
          console.log(
            '[BOOKINGS] pages cached:',
            Object.keys(pagesRef.current).sort((a, b) => a - b),
          );
        }

        // PREFETCH: when page1 replace occurs, try to prefetch remaining pages:
        // 1) if pagination present -> prefetch 2..last_page
        // 2) else -> fallback sequential prefetch 2..(1+MAX_PREFETCH) until empty page encountered
        if (!suppressPrefetch && replace && pageToFetch === 1) {
          if (pagination && pagination.last_page > 1) {
            const last = pagination.last_page;
            for (let next = 2; next <= last; next++) {
              if (
                !pagesRef.current[next] &&
                !fetchingPagesRef.current.has(next)
              ) {
                // fire-and-forget, but suppress nested prefetches
                fetchPage(next, false, true).catch(err => {
                  if (DEBUG) {
                    console.log('[BOOKINGS] prefetch error page', next, err);
                  }
                });
              }
            }
          } else {
            // fallback: sequentially fetch next pages until an empty array or MAX_PREFETCH reached
            (async () => {
              for (let next = 2; next <= 1 + MAX_PREFETCH; next++) {
                if (
                  pagesRef.current[next] ||
                  fetchingPagesRef.current.has(next)
                ) {
                  continue;
                }
                try {
                  const resp2 = await getAppoint(next);
                  const arr2 = Array.isArray(resp2) ? resp2 : resp2?.data || [];
                  if (!Array.isArray(arr2) || arr2.length === 0) {
                    if (DEBUG) {
                      console.log(
                        '[BOOKINGS] fallback prefetch stopped (empty) at page',
                        next,
                      );
                    }
                    break;
                  }
                  const normalized2 = normalizeAndAttachTs(arr2);
                  pagesRef.current = {
                    ...pagesRef.current,
                    [next]: sortDescByTsThenId(normalized2),
                  };
                  if (DEBUG) {
                    console.log(
                      '[BOOKINGS] fallback prefetch stored page',
                      next,
                      'count=',
                      arr2.length,
                    );
                  }
                  // rebuild merged each iteration so UI updates progressively
                  const merged2 = rebuildFromPages(pagesRef);
                  setItemsState(merged2);
                } catch (e) {
                  if (DEBUG) {
                    console.log(
                      '[BOOKINGS] fallback prefetch error page',
                      next,
                      e,
                    );
                  }
                  break; // stop on error
                } finally {
                  // ensure we remove fetching flag if getAppoint used in fetchPage set it; but here we used direct getAppoint
                }
              }
            })();
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

  // Update a single item across cached pages (or insert into page1 if not found)
  const updateItemInPages = useCallback(
    updated => {
      if (!updated || updated.id === undefined || updated.id === null) {
        return;
      }
      const norm = normalizeAndAttachTs([updated])[0];
      const pages = {...pagesRef.current};
      let changed = false;
      Object.keys(pages).forEach(pn => {
        const arr = pages[pn] || [];
        const idx = arr.findIndex(it => String(it.id) === String(norm.id));
        if (idx !== -1) {
          arr[idx] = {...arr[idx], ...norm};
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
        const merged = rebuildFromPages(pagesRef);
        setItemsState(merged);
        if (DEBUG) {
          console.log('[BOOKINGS] updateItemInPages applied id=', norm.id);
        }
      }
    },
    [setItemsState],
  );

  const removeItemFromPages = useCallback(
    id => {
      if (id === undefined || id === null) {
        return;
      }
      const pages = {...pagesRef.current};
      let changed = false;
      Object.keys(pages).forEach(pn => {
        const arr = pages[pn] || [];
        const newArr = arr.filter(it => String(it.id) !== String(id));
        if (newArr.length !== arr.length) {
          pages[pn] = newArr;
          changed = true;
        }
      });
      if (changed) {
        pagesRef.current = pages;
        const merged = rebuildFromPages(pagesRef);
        setItemsState(merged);
        if (DEBUG) {
          console.log('[BOOKINGS] removeItemFromPages removed id=', id);
        }
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
    if (fetchingPagesRef.current.has(nextPage)) {
      return;
    }
    if (!hasMore) {
      return;
    }
    fetchPage(nextPage, false);
  }, [fetchPage, hasMore]);

  // Developer helper: force fetch all known last_page (if available)
  const forceFetchAllPages = useCallback(async () => {
    const last = lastPageRef.current || 1;
    for (let p = 1; p <= last; p++) {
      if (!fetchingPagesRef.current.has(p) && !pagesRef.current[p]) {
        // fire-and-forget; use suppressed prefetch to prevent recursion
        fetchPage(p, false, true).catch(e => {
          if (DEBUG) {
            console.log('forceFetchAllPages error for', p, e);
          }
        });
      }
    }
  }, [fetchPage]);

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
    forceFetchAllPages,
  };
}

// Small components (unchanged)
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
    confirmed: {label: 'Confirmed', color: Colors.primary},
  };
  const s = map[status] || {label: status || '', color: Colors.primary};
  return (
    <View style={[styles.badge, {backgroundColor: s.color}]}>
      <Text style={styles.badgeText}>{t(s.label)}</Text>
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
  console.log(item);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.85}>
      <View style={styles.cardLeft}>
        <Image source={logoUri} style={styles.avatar} />
      </View>

      <View style={styles.cardMiddle}>
        <View style={{flexDirection: 'row'}}>
          <Text style={[styles.cardTitle]} numberOfLines={1}>
            {i18n.language === 'ar' ? item?.salon?.name_ar : item?.salon?.name}
          </Text>
        </View>
        <View style={styles.rowSmall}>
          <Text style={styles.muted}>
            {formatTime(item?.start_time, i18n.language)}
          </Text>
          <Text style={styles.muted}> • </Text>
          <Text style={styles.muted}>{formatDate(item?.date)}</Text>
        </View>
      </View>

      <View style={styles.cardRight}>
        {/* <StatusBadge status={item?.status} /> */}
        <View style={{height: 8}} />
        <View style={styles.detailPill}>
          <Text style={styles.detailPillText}>{i18n.t('Detail')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

function formatTimeTo12Hour(time24, lang = 'en') {
  if (!time24) {
    return '';
  }

  const [hrs, mins] = String(time24).split(':');
  let hour = parseInt(hrs, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) {
    hour = 12;
  }
  return `${hour}:${mins} ${ampm}`;
}

function formatDateShort(dateString) {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  const options = {weekday: 'long', day: 'numeric', month: 'short'};

  try {
    if (i18n.language === 'ar') {
      const formatter = new Intl.DateTimeFormat('ar-EG', options);
      const formatted = formatter.format(date);

      // convert Arabic digits back to English
      const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      const toEnglishDigits = s =>
        s.replace(/[٠-٩]/g, d => arabicDigits.indexOf(d));

      return toEnglishDigits(formatted);
    } else {
      return new Intl.DateTimeFormat('en-US', options).format(date);
    }
  } catch (e) {
    return date.toDateString();
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
    updateItemInPages,
    removeItemFromPages,
    forceFetchAllPages,
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
      // initial load: fetch page1 (replace) -> this triggers prefetch fallback if needed
      fetchPage(1, true);
    }, [isAuth, navigation, fetchPage]),
  );

  useEffect(() => {
    if (DEBUG) {
      console.log('[BOOKING] items changed count=', items.length);
    }
  }, [items]);

  const filterTab = useMemo(
    () => TABS.find(tp => tp.id === tabSelected),
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
      fetchPage(1, true);
    },
    [fetchPage],
  );

  // Debug developer helper: if DEBUG true, auto-force-fetch all pages 3 seconds after mount
  useEffect(() => {
    if (DEBUG) {
      const t = setTimeout(() => {
        if (DEBUG) {
          console.log('[BOOKING] DEBUG: forceFetchAllPages triggered');
        }
        forceFetchAllPages();
      }, 3000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [forceFetchAllPages]);

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
              if (!onEndReachedCalledDuringMomentum.current) {
                return;
              }
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
