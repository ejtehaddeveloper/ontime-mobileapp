import React, {useEffect, useState, useMemo, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  I18nManager,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {useNavigation} from '@react-navigation/native';
import Loading from '../../assets/common/Loading';
import {getAppointViewall} from '../../context/api';
import i18n from '../../assets/locales/i18';
import {t} from 'i18next';
import {SalonGridItem} from '../../components/home/index';

const isRTLglobal = i18n.language === 'ar';

I18nManager.forceRTL(isRTLglobal);

const NUM_COLUMNS = 3;

const View_all2 = () => {
  const navigation = useNavigation();
  const {width} = useWindowDimensions();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const numColumns = 3;
  const sidePadding = 20;
  const itemMargin = 15;
  const itemWidth = useMemo(
    () =>
      Math.floor(
        (width - sidePadding * 2 - itemMargin * (numColumns - 1)) / numColumns,
      ),
    [width],
  );

  const fetchServices = useCallback(async page => {
    try {
      setLoading(true);
      const data = await getAppointViewall(page);
      setServices(data?.data ?? []);
      setTotalPages(data?.pagination?.last_page ?? 1);
    } catch (error) {
      console.log('Error fetching data getAppoint:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices(currentPage);
  }, [currentPage, fetchServices]);

  const handleBookingDetails = useCallback(
    id => {
      console.log('Navigating to BookingDetails with id:', id);
      navigation.navigate('BookingDetails', {id});
    },
    [navigation],
  );
  const renderSalonItem = useCallback(
    ({item}) => (
      <SalonGridItem
        item={item}
        size={itemWidth}
        onPress={handleBookingDetails}
        isRTL={isRTLglobal}
      />
    ),
    [itemWidth, handleBookingDetails],
  );

  const handleGoBack = () => navigation.goBack();
  useEffect(() => {
    console.log('Services:', services[0]);
  }, [services]);
  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <Loading />
      ) : (
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons
              name={i18n.language === 'en' ? 'arrow-back' : 'arrow-forward'}
              size={25}
              onPress={handleGoBack}
            />
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t('Recent Booking')}</Text>
          </View>

          {/* Grid */}
          <View style={styles.listWrapper}>
            <FlatList
              style={{flex: 1}}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              data={services}
              renderItem={renderSalonItem}
              keyExtractor={item => String(item.id)}
              numColumns={numColumns}
              contentContainerStyle={{paddingBottom: 40, paddingHorizontal: 10}}
              columnWrapperStyle={{justifyContent: 'center'}}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={11}
              removeClippedSubviews={true}
            />
          </View>

          {/* Pagination always pinned at bottom */}
          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={[
                  styles.pageBtn,
                  currentPage === 1 && styles.pageBtnDisabled,
                ]}>
                <Ionicons
                  name={
                    i18n.language === 'en' ? 'chevron-back' : 'chevron-forward'
                  }
                  size={25}
                />
              </TouchableOpacity>

              <Text style={styles.pageText}>
                {currentPage} {t('of')} {totalPages}
              </Text>

              <TouchableOpacity
                disabled={currentPage >= totalPages}
                onPress={() =>
                  setCurrentPage(prev => Math.min(prev + 1, totalPages))
                }
                style={[
                  styles.pageBtn,
                  currentPage >= totalPages && styles.pageBtnDisabled,
                ]}>
                <Ionicons
                  name={
                    i18n.language === 'en' ? 'chevron-forward' : 'chevron-back'
                  }
                  size={25}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  content: {flex: 1},
  header: {
    padding: 16,
    flexDirection: isRTLglobal ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    marginTop: 25,
    paddingHorizontal: 26,
    width: '100%',
    flexDirection: isRTLglobal ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: isRTLglobal ? 'right' : 'left',
    width: '100%',
  },
  listWrapper: {flex: 1}, // makes FlatList take available height
  listContent: {
    padding: 15,
    alignItems: 'center',
  },
  card: {
    width: 120,
    marginBottom: 20,
    alignItems: 'center',
    padding: 5,
  },
  logo: {
    borderRadius: 50,
  },
  name: {
    fontSize: 12,
    color: Colors.black1,
    textAlign: 'center',
    marginTop: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  pageBtn: {
    padding: 10,
    marginHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#C2A68B',
  },
  pageBtnDisabled: {
    backgroundColor: '#ccc',
  },
  pageText: {
    fontSize: 16,
  },
});

export default View_all2;
