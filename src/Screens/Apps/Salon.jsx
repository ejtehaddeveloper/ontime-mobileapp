/* eslint-disable react-native/no-inline-styles */
/* RTL Responsive Version of the Salon Screen */
import React, {useContext, useEffect, useState} from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Pressable,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import AdSlider from '../../assets/common/adsSlider';
import {AuthContext} from '../../context/AuthContext';
import {
  deletefavorite,
  favorite,
  getCategory,
  getSalons,
  IFfavorite,
} from '../../context/api';
import Loading from '../../assets/common/Loading';
import i18n from '../../assets/locales/i18';
import {t} from 'i18next';
import {SafeAreaView} from 'react-native-safe-area-context';
import Heart from '../../assets/icons/heart.svg';
import {screenHeight} from '../../assets/constants/ScreenSize';
import {SvgXml} from 'react-native-svg';
import hostImge from '../../context/hostImge';

const Salon = ({route}) => {
  const {salonId} = route.params;
  const {width} = useWindowDimensions();
  const isRTL = i18n.language === 'ar';

  const [isHeart, setHeart] = useState(false);
  const [salon, setSalons] = useState([]);
  const [Cate, setCate] = useState([]);
  const [loading, setloading] = useState(true);
  const [auth, setAuth] = useState(false);
  const {isAuth} = useContext(AuthContext);
  const navigation = useNavigation();

  const calculateNumColumns = () => {
    return width > 600 ? 3 : width > 300 ? 3 : 2;
  };

  const categoryItemWidth = () => {
    const columns = calculateNumColumns();
    const padding = 16;
    return (width * 0.8 - padding * (columns + 1)) / columns;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const favoriteData = await IFfavorite(salonId);
        setHeart(favoriteData?.is_favorite || false);
      } catch (error) {
        console.log('Error fetching data:', error);
      }
    };

    const fetchSalon = async () => {
      try {
        const response = await getSalons(salonId);
        setSalons(response);
      } catch (error) {
        console.log('Salon Error ::', error);
      } finally {
        setloading(false);
      }
    };

    const fetchCategory = async () => {
      try {
        const response = await getCategory(salonId);
        setCate(response);
      } catch (error) {
        console.log('Category Error ::', error);
      } finally {
        setloading(false);
      }
    };

    fetchSalon();
    fetchCategory();
    if (isAuth) {
      fetchData();
    }
  }, [isAuth, salonId]);

  const handleGoBack = () => navigation.goBack();

  const handleService = (uuid, CatName) => {
    navigation.navigate('Service', {salonId, uuid, CatName});
  };

  const openMap = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      salon?.location?.address,
    )}`;
    Linking.openURL(url);
  };

  const toggleFavorite = async () => {
    if (!isAuth) {
      setAuth(true);
      return;
    }

    try {
      const response = isHeart
        ? await deletefavorite(salonId)
        : await favorite(salonId);
      if (response) {
        setHeart(prev => !prev);
      }
    } catch (error) {
      console.log('Favorite error:', error);
    }
  };

  // eslint-disable-next-line react/no-unstable-nested-components
  const SvgImage = ({imageUrl}) => {
    const [svgData, setSvgData] = useState('');

    useEffect(() => {
      const fetchSvgData = async () => {
        try {
          const response = await fetch(imageUrl);
          const text = await response.text();
          setSvgData(text);
        } catch (error) {
          console.log('Error fetching SVG:', error);
        }
      };

      if (imageUrl) {
        fetchSvgData();
      }
    }, [imageUrl]);

    return svgData ? <SvgXml xml={svgData} width="80" height="80" /> : null;
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, {writingDirection: isRTL ? 'rtl' : 'ltr'}]}>
      <View style={styles.header}>
        <Ionicons
          name={isRTL ? 'arrow-forward' : 'arrow-back'}
          size={25}
          onPress={handleGoBack}
        />
        <TouchableOpacity onPress={toggleFavorite}>
          {isHeart ? (
            <Ionicons name="heart" size={25} color={Colors.primary} />
          ) : (
            <Heart />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <Loading />
        ) : (
          <>
            <View>
              <View style={[styles.salonInfo]}>
                <Image
                  source={{uri: `${hostImge}${salon?.images?.logo}`}}
                  style={styles.salonLogo}
                  resizeMode="cover"
                />
                <View style={styles.salonDetails}>
                  <Text style={[styles.title]}>
                    {' '}
                    {isRTL ? salon?.name_ar : salon?.name}{' '}
                  </Text>
                  <Text style={[styles.description]}>
                    {' '}
                    {isRTL ? salon?.description_ar : salon?.description}{' '}
                  </Text>
                  <View style={[styles.location]}>
                    <Ionicons
                      name="location"
                      size={15}
                      color={Colors.primary}
                    />
                    <Text style={styles.locationText} numberOfLines={2}>
                      {' '}
                      {salon?.location?.address}{' '}
                    </Text>
                  </View>
                </View>
              </View>
              <View
                style={{
                  position: 'absolute',
                  alignSelf: 'flex-end',
                  bottom: 5,
                  right: 15,
                }}>
                <TouchableOpacity style={styles.mapButton} onPress={openMap}>
                  <Text style={styles.mapButtonText}>{t('Google Map')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {salon?.banners?.length > 0 ? (
              <View style={styles.adContainer}>
                <AdSlider paidAds={salon?.banners} />
              </View>
            ) : (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: Colors.border,
                  height: 0,
                  width: '90%',
                  marginVertical: 15,
                  alignSelf: 'center',
                }}
              />
            )}

            <FlatList
              nestedScrollEnabled
              data={Cate}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[styles.categoryItem, {width: categoryItemWidth()}]}
                  onPress={() =>
                    handleService(item.uuid, isRTL ? item.name_ar : item.name)
                  }>
                  <SvgImage imageUrl={item?.image} />
                  <Text style={[styles.categoryTitle, {textAlign: 'center'}]}>
                    {' '}
                    {isRTL ? item.name_ar : item.name}{' '}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={item =>
                item?.id?.toString() || Math.random().toString()
              }
              numColumns={calculateNumColumns()}
              key={calculateNumColumns()}
              contentContainerStyle={styles.categoriesContainer}
              style={styles.categoriesList}
            />

            {auth && (
              <Pressable
                style={styles.modalContainer}
                onPress={() => setAuth(false)}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    {t('You should log in to add to favorites')}
                  </Text>
                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() =>
                      navigation.navigate('Auth', {screen: 'LoginOrSignup'})
                    }>
                    <Text style={styles.loginButtonText}>{t('Login')}</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  container: {
    backgroundColor: '#fff',
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    paddingHorizontal: 35,
    alignItems: 'center',
  },
  salonInfo: {
    flexDirection: 'row',
    marginTop: 10,
    padding: 15,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  salonLogo: {
    width: 75,
    height: 75,
    borderRadius: 50,
  },
  salonDetails: {
    flex: 1,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    width: '100%',
  },
  description: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
    color: Colors.black3,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    maxWidth: '90%',
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 5,
    flex: 1,
  },
  mapButton: {
    minWidth: 113,
    height: 27,
    backgroundColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 10,
  },
  adContainer: {
    marginVertical: 20,
  },
  categoriesList: {
    alignSelf: 'center',
    width: '90%',
  },
  categoriesContainer: {
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  categoryItem: {
    alignItems: 'center',
    margin: 15,
    padding: 8,
    justifyContent: 'space-around',
  },
  categoryIcon: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 5,
  },
  modalContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    width: '100%',
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    width: '80%',
    maxWidth: 350,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 25,
    textAlign: 'center',
  },
  loginButton: {
    minWidth: 110,
    height: 45,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Salon;
