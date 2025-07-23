/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useContext, useState} from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  // Modal,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  // Pressable,
  SafeAreaView,
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

const Notifications = () => {
  const navigation = useNavigation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({});
  const [modalTitle, setModalTitle] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const {isAuth} = useContext(AuthContext);

  useFocusEffect(
    useCallback(() => {
      if (isAuth) {
        setLoading(true);
        fetchNotifications(1, true);
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{name: 'Auth'}],
          }),
        );
      }
    }, [isAuth, navigation]),
  );

  const fetchNotifications = async (pageNumber, initial = false) => {
    if (loadingMore) {
      return;
    }
    if (!initial && !hasMore) {
      return;
    }

    setLoadingMore(true);
    try {
      const newNotifications = await GetNotifications(pageNumber);

      // Check if there are new notifications and avoid duplicating data
      if (newNotifications.notifications.length > 0) {
        setData(
          prevData =>
            initial
              ? newNotifications.notifications // Reset data if it's initial fetch
              : [...prevData, ...newNotifications.notifications], // Append if not initial
        );
        setPage(pageNumber);
      } else {
        setHasMore(false); // No more data to fetch
      }
    } catch (error) {
      console.log('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setData([]); // Reset data on refresh
    fetchNotifications(1, true); // Fetch fresh notifications
    setRefreshing(false);
  };

  const handleView = async item => {
    const updatedData = data.map(notification =>
      notification.id === item.id
        ? {...notification, is_read: true}
        : notification,
    );

    await updateNotificationStatus(item.id);
    setData(updatedData);

    if (item.appointment) {
      let id = item?.appointment?.id;
      console.log('id', id);
      navigation.navigate('BookingDetails', {id});
    } else {
      setModalTitle(i18n.language === 'ar' ? item?.title_ar : item?.title);
      setModalContent(i18n.language === 'ar' ? item?.body_ar : item?.body);
      setModalVisible(true);
    }
  };

  const updateNotificationStatus = async id => {
    try {
      const newNotifications = await updateis_read(id);
      console.log('newNotifications', newNotifications);
    } catch (error) {
      console.log('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const renderItem = ({item}) => {
    const envelopeIcon = item?.is_read ? 'envelope-open' : 'envelope';

    return (
      <TouchableOpacity style={styles.row} onPress={() => handleView(item)}>
        <Image
          source={{
            uri: item?.project?.logo
              ? item?.project?.logo
              : item?.appointment?.salon?.images?.logo,
          }}
          style={styles.image}
        />
        <View>
          <Text style={[styles.text, {fontWeight: '300', fontSize: 13}]}>
            {i18n.language === 'en' ? item?.title : item?.title_ar}
          </Text>
          <Text style={styles.details}>
            {(i18n.language === 'en' ? item?.body : item?.body_ar)
              .split(' ')
              .slice(0, 5)
              .join(' ')}
            {i18n.language === 'en' ? ' ...' : ''}
          </Text>
        </View>
        <View
          style={{
            width: 50,
            height: 50,
            alignItems: 'center',
            marginTop: 10,
          }}>
          <View
            style={{
              width: 26,
              height: 26,
              backgroundColor: Colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 50,
            }}>
            <FontAwesome name={envelopeIcon} size={14} color={'#fff'} />
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
  };

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
                // style={{marginBottom: 10}}
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
    padding: 20,
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
    marginLeft: i18n.language === 'ar' ? 0 : 15,
    marginRight: i18n.language === 'ar' ? 15 : 0,
    color: '#000',
    // backgroundColor: '#000',
    // width: 185,
  },
  row: {
    width: '100%',
    height: 60,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    borderRadius: 10,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: 35,
    height: 35,
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
