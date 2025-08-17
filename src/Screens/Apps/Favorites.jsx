/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useContext, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {Colors} from '../../assets/constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
// import salons from '../../data/salons.json';
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
const Favorites = () => {
  // const noti = salons;
  const {isAuth} = useContext(AuthContext);

  const navigation = useNavigation();

  const [favorite, setfavorite] = useState([]);
  const [loading, setloading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isAuth) {
        setloading(true);
        fetchData();
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

  const fetchData = async () => {
    try {
      const Data = await getfavorite();
      setfavorite(Data);
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      setloading(false);
      setLoadingMore(false);
    }
  };

  const heart = async id => {
    try {
      const response = await deletefavorite(id);
      if (response) {
        console.log('deleteF :', response);
        handleRefresh();
      }
    } catch (error) {
      console.log('Favorit error', error);
    }
  };

  const handleRefresh = () => {
    setloading(true);
    fetchData();
    setloading(false);
  };

  const handleGoSalon = salonId => {
    navigation.navigate('Salon', {salonId});
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <ScrollView contentContainerStyle={styles.contaner}>
        <View style={{alignItems: 'center', marginTop: 25}}>
          <Text style={styles.title}>{t('Favorites')}</Text>
        </View>
        {loading ? (
          <Loading />
        ) : (
          <>
            {favorite?.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: screenHeight * 0.18,
                }}>
                <Ionicons
                  name="heart-dislike-outline"
                  size={60}
                  color={Colors.primary}
                  style={{marginBottom: 16}}
                />
                <Text
                  style={{
                    alignSelf: 'center',
                    width: 240,
                    textAlign: 'center',
                    fontSize: 16,
                    color: Colors.black3,
                  }}>
                  {t("You don't have any favorites yet")}
                </Text>
              </View>
            ) : (
              <View style={{}}>
                <FlatList
                  nestedScrollEnabled={true}
                  data={favorite}
                  renderItem={({item}) => {
                    const slug = item.slug;
                    const number = slug.match(/\d+$/);
                    const extractedNumber = number ? number[0] : null;
                    return (
                      <TouchableOpacity
                        style={styles.body}
                        onPress={() => handleGoSalon(extractedNumber)}>
                        <View style={{flexDirection: 'row'}}>
                          <Image
                            source={{uri: `${hostImge}${item?.images?.logo}`}}
                            style={{
                              width: 55,
                              height: 55,
                              borderRadius: 50,
                              margin: 10,
                            }}
                          />
                          <View style={{justifyContent: 'center'}}>
                            <Text style={styles.lable}>
                              {i18n.language === 'ar'
                                ? item?.name_ar
                                : item?.name}
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name="heart"
                          size={24}
                          color={Colors.primary}
                          onPress={() => heart(item?.id)}
                        />
                      </TouchableOpacity>
                    );
                  }}
                  keyExtractor={item => item.id.toString()}
                  refreshing={loading}
                  onRefresh={handleRefresh}
                  ListFooterComponent={
                    loadingMore ? <Text>Loading...</Text> : null
                  }
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  contaner: {
    flex: 1,
    // padding: 20,
    // paddingBottom: 100,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  title2: {
    fontSize: 12,
    alignSelf: 'center',
    marginTop: 5,
  },
  title3: {
    fontSize: 12,
    color: Colors.black3,
  },
  lable: {
    fontSize: 16,
    // marginLeft: 25,
    fontWeight: '700',
  },
  body: {
    borderBottomColor: Colors.border,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: 8,
    padding: 8,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  button: {
    width: 342,
    height: 68,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 80,
    marginBottom: 25,
    flexDirection: 'row',
  },
  modalContainer: {
    alignItems: 'center',
    borderWidth: 1,
    elevation: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    position: 'absolute',
    marginTop: 250,
    alignSelf: 'center',
    height: 150,
    padding: 20,
    borderColor: Colors.border,
    borderRadius: 15,
  },
});

export default Favorites;
