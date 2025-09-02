/* eslint-disable react-hooks/exhaustive-deps */
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
  FlatList,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {
  CommonActions,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import i18n from '../../assets/locales/i18';
import {t} from 'i18next';
import {GetNotifications, updateis_read} from '../../context/api';
import {Colors} from '../../assets/constants';
import Loading from '../../assets/common/Loading';
import {AuthContext} from '../../context/AuthContext';

const NotificationRow = memo(({item, onPress}) => {
  const isRead = !!item?.is_read;
  const envelopeIcon = isRead ? 'envelope-open' : 'envelope';
  const rowHighlight = isRead ? '#FFFFFF' : '#eef8ffff';
  const badgeBg = isRead ? '#E0E0E0' : '#D0EEFF';
  const badgeSize = 26;
  const iconColor = isRead ? Colors.primary : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[styles.row, {backgroundColor: rowHighlight}]}
      onPress={() => onPress(item)}>
      <Image
        source={{
          uri: item?.project?.logo
            ? item?.project?.logo
            : item?.appointment?.salon?.images?.logo,
        }}
        style={styles.image}
      />
      <View style={{flex: 1, justifyContent: 'center'}}>
        <Text style={[styles.text, {fontWeight: '300', fontSize: 13}]}>
          {i18n.language === 'en' ? item?.title : item?.title_ar}
        </Text>
        <Text style={styles.details} numberOfLines={3} ellipsizeMode="tail">
          {i18n.language === 'en' ? item?.body : item?.body_ar}
        </Text>
      </View>
      <View style={{width: 70, alignItems: 'center', marginTop: 10}}>
        <View
          style={{
            width: badgeSize,
            height: badgeSize,
            backgroundColor: badgeBg,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: badgeSize / 2,
          }}>
          <FontAwesome name={envelopeIcon} size={14} color={iconColor} />
        </View>
        <Text style={styles.time}>
          {new Date(item?.created_at)?.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const Notifications = () => {
  const navigation = useNavigation();
  const [data, setData] = useState([]);
  const dataRef = useRef([]); // canonical list to avoid unnecessary setState
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({});
  const [modalTitle, setModalTitle] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const {isAuth} = useContext(AuthContext);

  const fetchNotifications = useCallback(
    async (pageNumber, {initial = false, prependOnly = false} = {}) => {
      if (pageNumber > 1 && loadingMore) return;
      if (!initial && !prependOnly && pageNumber === 1 && loading === false) {
        // allow normal fetch
      }
      if (!initial && !hasMore && pageNumber > 1) return;

      if (pageNumber > 1) setLoadingMore(true);
      if (pageNumber === 1 && initial) setLoading(true);

      try {
        const result = await GetNotifications(pageNumber);
        const newNotifications = result?.notifications ?? [];

        if (pageNumber === 1) {
          if (initial && dataRef.current.length === 0) {
            // first-time load
            dataRef.current = newNotifications;
            setData(newNotifications);
            setHasMore(newNotifications.length > 0);
            setPage(1);
            return;
          }

          if (prependOnly) {
            // only prepend new items if they don't already exist
            if (!newNotifications || newNotifications.length === 0) {
              return;
            }
            const existingIds = new Set(dataRef.current.map(n => n.id));
            const toPrepend = newNotifications.filter(
              n => !existingIds.has(n.id),
            );
            if (toPrepend.length > 0) {
              dataRef.current = [...toPrepend, ...dataRef.current];
              setData([...dataRef.current]);
            }
            return;
          }

          // normal replace on explicit refresh (only update if changed)
          const existingIds = dataRef.current.map(n => n.id).join(',');
          const incomingIds = newNotifications.map(n => n.id).join(',');
          if (existingIds !== incomingIds) {
            dataRef.current = newNotifications;
            setData(newNotifications);
          }
          setPage(1);
          setHasMore(newNotifications.length > 0);
          return;
        } else {
          // pagination append
          if (newNotifications.length > 0) {
            const existingIds = new Set(dataRef.current.map(n => n.id));
            const append = newNotifications.filter(n => !existingIds.has(n.id));
            if (append.length > 0) {
              dataRef.current = [...dataRef.current, ...append];
              setData([...dataRef.current]);
            }
            setPage(pageNumber);
          } else {
            setHasMore(false);
          }
        }
      } catch (error) {
        console.log('Error fetching notifications:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [hasMore, loading, loadingMore],
  );

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

      // if no data loaded yet -> initial fetch; otherwise only check for new items
      if (dataRef.current.length === 0) {
        setLoading(true);
        fetchNotifications(1, {initial: true});
      } else {
        // lightweight check: prepend only new notifications (do not replace whole list)
        fetchNotifications(1, {prependOnly: true});
      }
    }, [isAuth, navigation, fetchNotifications]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    // replace list if changed
    fetchNotifications(1, {initial: true});
  };

  const handleView = async item => {
    try {
      // optimistic update locally
      const updatedData = dataRef.current.map(notification =>
        notification.id === item.id
          ? {...notification, is_read: true}
          : notification,
      );
      dataRef.current = updatedData;
      setData(updatedData);

      await updateis_read(item.id);

      if (item.appointment) {
        let id = item?.appointment?.id;
        navigation.navigate('BookingDetails', {id});
      } else {
        setModalTitle(i18n.language === 'ar' ? item?.title_ar : item?.title);
        setModalContent(i18n.language === 'ar' ? item?.body_ar : item?.body);
        setModalVisible(true);
      }
    } catch (error) {
      console.log('Error updating notification status', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const renderItem = useCallback(
    ({item}) => <NotificationRow item={item} onPress={handleView} />,
    [handleView],
  );

  useEffect(() => {
    if (dataRef.current.length === 0) {
      setLoading(true);
      fetchNotifications(1, {initial: true});
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={styles.container}>
        <Text style={styles.header}>{t('Notifications')}</Text>
        {loading ? (
          <Loading />
        ) : (
          <>
            {data?.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={[styles.text, {alignSelf: 'center'}]}>
                  {t("You don't have any notifications yet")}
                </Text>
              </View>
            ) : (
              <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={item => item?.id?.toString()}
                onEndReached={() => fetchNotifications(page + 1)}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingMore ? <Loading /> : null}
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />
            )}
          </>
        )}

        <Modal visible={modalVisible} transparent={true} animationType="slide">
          <Pressable
            style={styles.modalContainer}
            onPress={() => setModalVisible(false)}>
            <Pressable style={styles.modalContent}>
              <Text style={styles.modalText}>{modalTitle}</Text>
              <Text style={{textAlign: 'center'}}>{modalContent}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>{t('Close')}</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
    alignSelf: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    // backgroundColor: '#000',
    // width: 185,
  },
  row: {
    width: '100%',
    height: 80,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'space-between',
  },
  image: {
    width: 45,
    height: 45,
    borderRadius: 50,
    backgroundColor: Colors.primary,
  },
  details: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: i18n.language === 'ar' ? 0 : 15,
    marginRight: i18n.language === 'ar' ? 15 : 0,
    color: '#a1a1a1',
    width: 185,
  },
  time: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a1a1a1',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default Notifications;
