/*
  Booking Screen — Icon fallback for missing salon image
  - If salon image is missing, show a consistent app-style icon (Ionicons) inside the avatar box
  - Keeps card visuals, status badge, pagination and RTL support
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  useNavigation,
  CommonActions,
  useFocusEffect,
} from '@react-navigation/native';
import {AuthContext} from '../../context/AuthContext';
import {getAppoint} from '../../context/api';
import {Colors} from '../../assets/constants';
import i18n from '../../assets/locales/i18';
import {useTranslation} from 'react-i18next';
import {screenHeight} from '../../assets/constants/ScreenSize';

const TABS = [
  {id: 1, name: 'Booked', name_ar: 'محجوز', status: ['pending', 'rescheduled']},
  {id: 2, name: 'Completed', name_ar: 'اكتمل', status: ['completed']},
  {id: 3, name: 'Cancelled', name_ar: 'ألغي', status: ['cancelled']},
];

// Lightweight bookings hook (same behavior as before)
function useBookings(initialPage = 1) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pendingFetchRef = useRef(false);

  const fetchPage = useCallback(async (pageToFetch = 1, replace = false) => {
    if (pendingFetchRef.current) return;
    pendingFetchRef.current = true;
    if (pageToFetch === 1 && !replace) setLoading(true);
    try {
      const data = await getAppoint(pageToFetch);
      const arr = Array.isArray(data) ? data : [];
      if (replace || pageToFetch === 1) setItems(arr);
      else setItems(prev => [...prev, ...arr]);
      setHasMore(arr.length > 0);
      setPage(pageToFetch);
    } catch (err) {
      console.log('useBookings fetch error', err);
    } finally {
      pendingFetchRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || pendingFetchRef.current) return;
    fetchPage(page + 1);
  }, [fetchPage, hasMore, page]);

  return {
    items,
    loading,
    refreshing,
    fetchPage,
    refresh,
    loadMore,
    hasMore,
    setItems,
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
  // Use cache: 'force-cache' for standard RN Image, or replace with FastImage for better control
  const logoUrl = item?.salon?.images?.logo;
  const hasLogo = !!logoUrl;
  const logoUri = hasLogo ? {uri: logoUrl, cache: 'force-cache'} : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.85}>
      <View style={styles.cardLeft}>
        {hasLogo ? (
          <Image source={logoUri} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.iconWrap]}>
            <Ionicons name="cut" size={28} color={Colors.primary} />
          </View>
        )}
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

// utilities
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
  const {t} = useTranslation();

  const [tabSelected, setTabSelected] = useState(1);
  const {items, loading, refreshing, fetchPage, refresh, loadMore, hasMore} =
    useBookings(1);

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
    id => navigation.navigate('BookingDetails', {id}),
    [navigation],
  );
  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) loadMore();
  }, [loading, hasMore, loadMore]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('Bookings')}</Text>
      </View>

      <View style={styles.content}>
        <TabBar selectedId={tabSelected} onSelect={setTabSelected} />

        {loading && items.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
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
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            ListFooterComponent={() =>
              loading && hasMore ? (
                <ActivityIndicator style={{margin: 12}} />
              ) : null
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} />
            }
            showsVerticalScrollIndicator={false}
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
  header: {alignItems: 'center', marginBottom: 14},
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
  listContent: {paddingBottom: 140},
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
