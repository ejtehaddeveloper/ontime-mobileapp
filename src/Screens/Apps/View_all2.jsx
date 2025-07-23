/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  useWindowDimensions,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../assets/constants';
import { useNavigation } from '@react-navigation/native';
import Loading from '../../assets/common/Loading';
import { getAppointViewall } from '../../context/api';
import i18n from '../../assets/locales/i18';
import { t } from 'i18next';

const isRTL = i18n.language === 'ar';
I18nManager.forceRTL(isRTL);

const View_all2 = () => {
  const navigation = useNavigation();
  const {width} = useWindowDimensions();

  const numColumns = 3;

  const [Service, setService] = useState([]);
  const [loading, setloading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleGoSalon = salonId => {
    navigation.navigate('Salon', {salonId});
  };

  // const filterBookings = Service.filter(item => item.status === 'pending');

  const fetchservices = async page => {
    try {
      const Data = await getAppointViewall(page);
      setService(Data?.data);
      setTotalPages(Data?.pagination?.last_page);
      console.log('jjjjjjjjjjjjjjjjjjjj', Data?.data);
    } catch (error) {
      console.log('Error fetching data getAppoint:', error);
    } finally {
      setloading(false);
    }
  };
  useEffect(() => {
    if (currentPage) {
      fetchservices(currentPage);
    }
  }, [currentPage]);

  const renderItem = ({item}) => {
    const itemWidth = width < 360 ? width * 0.3 : width / numColumns - 40;

    return (
      <TouchableOpacity
        style={{
          width: 120,
          height: itemWidth + 20,
          marginBottom: 20,
          alignItems: 'center',
          padding: 5,
        }}
        onPress={() => handleGoSalon(item.id)}>
        <Image
          source={{uri: item.salon.images.logo}}
          style={{
            width: Math.min(itemWidth - 10, 72),
            height: Math.min(itemWidth - 10, 72),
            borderRadius: 50,
          }}
          resizeMode="cover"
        />
        <Text style={[styles.name, {textAlign: 'center', marginTop: 8}]}>
          {i18n.language === 'ar' ? item?.salon?.name_ar : item?.salon?.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleGoBack = () => navigation.goBack();

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
          <ScrollView
            style={styles.container}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
      {loading ? (
        <Loading />
      ) : (
        <>
          <View
            style={{
              padding: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexDirection: isRTL ? 'row-reverse' : 'row' 
            }}>
            <Ionicons
              name={i18n.language === 'en' ? 'arrow-back' : 'arrow-forward'}
              size={25}
              onPress={handleGoBack}
            />
          </View>
          <View style={{marginTop: 25, padding: 16, width: '100%'}}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between',paddingHorizontal: 10 }}>
                <Text style={styles.welcome}>{t('Recent Booking')}</Text>
              </View>
            <FlatList
              nestedScrollEnabled={true}
              data={Service}
              renderItem={renderItem}
              keyExtractor={item => item.id.toString()}
              numColumns={numColumns}
              contentContainerStyle={{
                padding: 15,
                alignItems: 'center',
              }}
              key={`list-${numColumns}`}
            />
            {totalPages > 1 && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginVertical: 20,
                }}>
                <TouchableOpacity
                  disabled={currentPage === 1}
                  onPress={() => {
                    const newPage = currentPage - 1;
                    setCurrentPage(newPage);
                  }}
                  style={{
                    padding: 10,
                    marginRight: 10,
                    borderRadius: 12,
                    backgroundColor: currentPage === 1 ? '#ccc' : '#C2A68B',
                  }}>
                  <Ionicons
                    name={
                      i18n.language === 'en'
                        ? 'chevron-back'
                        : 'chevron-forward'
                    }
                    size={25}
                  />
                </TouchableOpacity>

                <Text style={{padding: 10, fontSize: 16}}>
                  {currentPage} {t('of')} {totalPages}
                </Text>

                <TouchableOpacity
                  disabled={currentPage >= totalPages}
                  onPress={() => {
                    const newPage = currentPage + 1;
                    setCurrentPage(newPage);
                  }}
                  style={{
                    padding: 10,
                    marginLeft: 10,
                    borderRadius: 12,
                    backgroundColor:
                      currentPage >= totalPages ? '#ccc' : '#C2A68B',
                  }}>
                  <Ionicons
                    name={
                      i18n.language === 'en'
                        ? 'chevron-forward'
                        : 'chevron-back'
                    }
                    size={25}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 18,
    marginTop: 5,
    fontWeight: '600',
    textAlign: isRTL ? 'right' : 'left',
  },
  title2: {
    fontSize: 18,
    color: '#fff',
  },
  searchBar: {
    height: 50,
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingHorizontal: 15,
    marginVertical: 10,
    elevation: 5,
    backgroundColor: '#fff',
  },
  searchText: {
    fontSize: 14,
    color: Colors.black3,
    marginLeft: 5,
  },
  filter: {
    width: 40,
    height: 50,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginLeft: 3,
    elevation: 5,
    backgroundColor: '#fff',
  },
  item: {
    flexDirection: 'row',
    marginVertical: 5,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    marginHorizontal: 5,
    fontSize: 14,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  button: {
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  welcome: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: isRTL ? 'right' : 'left',
    width: '100%',
  },
  name: {
    fontSize: 12,
    color: Colors.black1,
  },
  name1: {
    fontSize: 18,
    color: Colors.black1,
    marginTop: 5,
    marginLeft: 5,
  },
  clearFilter: {
    width: 40,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
  clearFilterText: {
    fontSize: 10,
    color: Colors.primary,
  },
  cartLength: {
    width: 15,
    height: 15,
    borderRadius: 50,
    backgroundColor: 'red',
    position: 'absolute',
    color: '#fff',
    zIndex: 10,
    textAlign: 'center',
    left: 20,
    fontSize: 10,
    top: 5,
  },
});

export default View_all2;
