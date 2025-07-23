/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useContext, useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Platform,
  SafeAreaView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {AuthContext} from '../../context/AuthContext';
import AdSlider from '../../assets/common/adsSlider';
import Loading from '../../assets/common/Loading';

import {
  getAddress,
  getCart,
  getFilter,
  getFilterService,
  getHome,
  getHomewi,
  getSearch,
  getusers,
} from '../../context/api';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';
import hostImge from '../../context/hostImge';

const Home = () => {
  const {isAuth} = useContext(AuthContext);
  const navigation = useNavigation();
  const {width, height} = useWindowDimensions();

  // Responsive number of columns: 2 for small phones, 3 for phones, 4+ for tablets
  const numColumns = width >= 768 ? 4 : 3;

  // Calculate item width with padding/margin considered
  const sidePadding = 20;
  const itemMargin = 15;
  const itemWidth =
    (width - sidePadding * 2 - itemMargin * (numColumns - 1)) / numColumns;

  const searchBarWidth = Math.min(width * 0.75, 450);

  const [isFilterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState([]);
  const [Services, setServices] = useState([]);
  const [search, setSearch] = useState('');
  const [max, setMax] = useState(null);
  const [min, setMin] = useState(null);
  const [service, setService] = useState([]);
  const [ads, setads] = useState([]);
  const [address, setAddress] = useState([]);
  const [cart, setCart] = useState([]);
  const [recent, setRecent] = useState([]);
  const [userInfo, setUserInfo] = useState([]);
  const [salons, setSalons] = useState([]);
  const [SarFind, setSarFind] = useState([]);
  const [loading, setloading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [is_popular, setIs_popular] = useState(false);
  const [price_sort, setprice_sort] = useState(null);
  const [filteredProducts, setfilteredProducts] = useState([]);
  const [isServices, setisServices] = useState(null);

  const isRTL = i18n.language === 'ar';

  const Recent = recent;
  const Salon = salons;
  const filterD = address;
  const filteredData = SarFind;

  const sortingOptions = [
    {id: 1, label: 'Most Popular', label2: t('Most Popular')},
    {
      id: 2,
      label: 'Cost Low to High',
      label2: t('Cost Low to High'),
      exclusive: true,
    },
    {
      id: 3,
      label: 'Cost High to Low',
      label2: t('Cost High to Low'),
      exclusive: true,
    },
  ];

  const handleGoSalon = salonId => {
    navigation.navigate('Salon', {salonId});
  };

  useFocusEffect(
    useCallback(() => {
      if (isAuth) {
        fetchUser();
      }
    }, [isAuth]),
  );

  const fetchUser = async () => {
    try {
      const Data = await getusers();
      setUserInfo(Data);
    } catch (error) {
      console.log('Error fetching data:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAuth) {
          const Data = await getHomewi();
          setRecent(Data?.recent_appointments || []);
          setSalons(Data?.salons || []);
          setads(Data?.banners || []);
        } else {
          const Data = await getHome();
          setSalons(Data.salons || []);
          setads(Data.banners || []);
        }
      } catch (error) {
        console.log('Error fetching data:', error);
      } finally {
        setloading(false);
      }
    };

    fetchData();

    const fetchservices = async () => {
      try {
        const Data = await getFilterService();
        setService(Data || []);
      } catch (error) {
        console.log('Error fetching data getFilterService:', error);
      }
    };

    const fetchaddress = async () => {
      try {
        const Data = await getAddress();
        setAddress(Data || []);
      } catch (error) {
        console.log('Error fetching data getAddress:', error);
      }
    };

    if (isAuth) {
      fetchUser();
    }
    fetchservices();
    fetchaddress();
  }, [isAuth]);

  const fetchCart = async () => {
    try {
      const Data = await getCart();
      setCart(Data.data || []);
    } catch (error) {
      console.log('Error fetching data Cart:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, []),
  );

  const handleFilter = location => {
    setSelectedLocation(prevSelected =>
      prevSelected.includes(location)
        ? prevSelected.filter(item => item !== location)
        : [...prevSelected, location],
    );
  };

  const handleService = serves => {
    setServices(prevSelected =>
      prevSelected.includes(serves)
        ? prevSelected.filter(item => item !== serves)
        : [...prevSelected, serves],
    );
  };

  const fetchSearch = async () => {
    if (search.length === 0) {
      return;
    }
    setIsLoading(true);
    try {
      const data = await getSearch(search);
      setSarFind(data || []);
    } catch (error) {
      console.log('Error fetching search data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSearch();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openFilter = () => {
    setFilterVisible(true);
    setFilter(false);
  };

  const toggleSelection = option => {
    let updatedSelection;

    if (option.exclusive) {
      updatedSelection = selectedOptions.includes(option.id)
        ? selectedOptions.filter(id => id !== option.id)
        : [
            ...selectedOptions.filter(
              id => !sortingOptions.find(o => o.exclusive && o.id === id),
            ),
            option.id,
          ];
    } else {
      updatedSelection = selectedOptions.includes(option.id)
        ? selectedOptions.filter(id => id !== option.id)
        : [...selectedOptions, option.id];
    }

    setSelectedOptions(updatedSelection);
  };

  useEffect(() => {
    setIs_popular(selectedOptions.includes(1) ? true : null);
    setisServices(Services.length > 0 ? Services.join(',') : null);

    if (selectedOptions.includes(3) && !selectedOptions.includes(4)) {
      setprice_sort('desc');
    } else if (selectedOptions.includes(4) && !selectedOptions.includes(3)) {
      setprice_sort('asc');
    } else {
      setprice_sort(null);
    }
  }, [selectedOptions, Services]);

  const handleCloseFilter = async () => {
    if (
      selectedLocation !== null ||
      Services.length !== 0 ||
      selectedOptions.length !== 0 ||
      min !== null ||
      max !== null
    ) {
      try {
        const Data = await getFilter(
          isServices,
          selectedLocation,
          price_sort,
          min,
          max,
          is_popular,
        );
        if (Data) {
          setfilteredProducts(Data);
        }
      } catch (error) {
        console.log('Error fetching data:', error);
      }
      setFilter(true);
      setFilterVisible(false);
    } else {
      setFilter(false);
    }
  };

  const resetFilters = () => {
    setSelectedLocation([]);
    setServices([]);
    setSelectedOptions([]);
    setMin(null);
    setMax(null);
    setFilter(false);
    setfilteredProducts([]);
    setFilterVisible(false);
  };

  const handleGoCart = () => {
    navigation.navigate('Cart');
  };

  const goView_all = () => {
    navigation.navigate('View_all');
  };

  const goView_all2 = () => {
    navigation.navigate('View_all2');
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={{
        width: itemWidth,
        marginBottom: 20,
        marginRight: itemMargin,
        alignItems: 'center',
        padding: 5,
      }}
      onPress={() => handleGoSalon(item?.id)}>
      <Image
        source={{uri: `${hostImge}${item?.images?.logo}`}}
        style={{
          width: Math.min(itemWidth - 10, 72),
          height: Math.min(itemWidth - 10, 72),
          borderRadius: 50,
        }}
        resizeMode="cover"
      />
      <Text
        style={[
          styles.name,
          {textAlign: 'center', marginTop: 8, width: '100%'},
        ]}>
        {isRTL ? item.name_ar : item.name}
      </Text>
    </TouchableOpacity>
  );

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
            {!isFilterVisible && (
              <View style={styles.headerContainer}>
                <View>
                  <Text style={[styles.title, {fontSize: 24}]}>
                    {t('Welcome')}
                  </Text>
                  {isAuth && (
                    <Text style={styles.name1}>{userInfo?.name} !</Text>
                  )}
                </View>
                {isAuth && cart.length > 0 && (
                  <TouchableOpacity
                    onPress={handleGoCart}
                    style={styles.cartIcon}>
                    <Text style={styles.cartLength}>{cart.length}</Text>
                    <Ionicons
                      name="cart-outline"
                      size={25}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View>
              <View style={styles.searchFilterContainer}>
                <View style={[styles.searchBar, {width: searchBarWidth}]}>
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={Colors.primary}
                  />
                  <TextInput
                    placeholder={t('Search here')}
                    value={search}
                    onChangeText={setSearch}
                    style={[styles.searchText]}
                    placeholderTextColor={Colors.primary}
                  />
                </View>
                <View style={{flexDirection: 'column', alignItems: 'center'}}>
                  <TouchableOpacity style={styles.filter} onPress={openFilter}>
                    <Ionicons
                      name="filter-outline"
                      size={25}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Modal
                visible={isFilterVisible}
                transparent
                animationType="slide">
                <View style={styles.modalContainer}>
                  <TouchableOpacity
                    activeOpacity={1}
                    style={{flex: 1}}
                    onPress={() => setFilterVisible(false)}
                  />

                  <View
                    style={[
                      styles.modalContentWrapper,
                      {maxHeight: height * 0.9, width: '100%'},
                    ]}>
                    <ScrollView
                      contentContainerStyle={{padding: 20}}
                      showsVerticalScrollIndicator={true}
                      bounces={false}
                      keyboardShouldPersistTaps="handled">
                      <View>
                        <TouchableOpacity
                          style={styles.clearFilter}
                          onPress={resetFilters}>
                          <Text style={styles.clearFilterText}>
                            {t('Clear')}
                          </Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>{t('Services')}</Text>
                        <View style={styles.chipContainer}>
                          {service.map((Service, index) => {
                            const isSelected = Services.includes(Service.uuid);
                            return (
                              <TouchableOpacity
                                key={index}
                                onPress={() => handleService(Service.uuid)}
                                style={[
                                  styles.chip,
                                  isSelected && styles.selectedChip,
                                ]}>
                                <Text
                                  style={[
                                    styles.chipText,
                                    isSelected && styles.selectedText,
                                  ]}>
                                  {isRTL ? Service.name_ar : Service.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                      <View>
                        <Text style={styles.title}>{t('Address')}</Text>
                        <View style={styles.chipContainer}>
                          {filterD.map((Address, index) => {
                            const isSelected = selectedLocation.includes(
                              Address.id,
                            );
                            return (
                              <TouchableOpacity
                                key={index}
                                onPress={() => handleFilter(Address.id)}
                                style={[
                                  styles.chip,
                                  isSelected && styles.selectedChip,
                                ]}>
                                <Text
                                  style={[
                                    styles.chipText,
                                    isSelected && styles.selectedText,
                                  ]}>
                                  <Ionicons
                                    name="location"
                                    color={isSelected ? 'white' : Colors.black3}
                                    size={20}
                                  />
                                  {isRTL ? Address.city_ar : Address.city}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                      <View style={{padding: 20}}>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            marginBottom: 10,
                          }}>
                          {t('Sort By')}
                        </Text>
                        {sortingOptions.map(option => (
                          <TouchableOpacity
                            key={option.id}
                            onPress={() => toggleSelection(option)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginVertical: 8,
                              justifyContent: 'space-between',
                            }}>
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: selectedOptions.includes(option.id)
                                  ? 'bold'
                                  : 'normal',
                                color: selectedOptions.includes(option.id)
                                  ? '#333'
                                  : '#777',
                              }}>
                              {option.label2}
                            </Text>
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 5,
                                borderWidth: 2,
                                borderColor: '#C2A68B',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 10,
                              }}>
                              {selectedOptions.includes(option.id) && (
                                <View
                                  style={{
                                    width: 12,
                                    height: 12,
                                    backgroundColor: '#C2A68B',
                                    borderRadius: 3,
                                  }}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View>
                        <Text style={styles.title}>{t('Price')}</Text>
                        <View style={styles.priceInputContainer}>
                          <TextInput
                            placeholder={t('Max')}
                            value={max}
                            onChangeText={value => setMax(value)}
                            style={styles.priceInput}
                            keyboardType="phone-pad"
                            placeholderTextColor={Colors.black3}
                          />
                          <TextInput
                            placeholder={t('Min')}
                            value={min}
                            onChangeText={value => setMin(value)}
                            style={styles.priceInput}
                            keyboardType="phone-pad"
                            placeholderTextColor={Colors.black3}
                          />
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.button,
                          {
                            width: Math.min(width * 0.9, 360),
                            marginVertical: 30,
                          },
                        ]}
                        onPress={handleCloseFilter}>
                        <Text style={styles.title2}>{t('Search')}</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </View>
              </Modal>

              {search.length > 0 && (
                <>
                  {isLoading ? (
                    <Loading />
                  ) : (
                    <>
                      {filteredData.length > 0 ? (
                        <FlatList
                          nestedScrollEnabled
                          data={filteredData}
                          renderItem={renderItem}
                          keyExtractor={item => item.id.toString()}
                          numColumns={numColumns}
                          contentContainerStyle={{
                            padding: 20,
                            alignItems: 'center',
                          }}
                          columnWrapperStyle={{justifyContent: 'flex-start'}}
                          key={`list-${numColumns}`}
                        />
                      ) : (
                        <View style={styles.noResultContainer}>
                          <Text>{t('No result found!')}</Text>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}

              {filter && (
                <>
                  {filteredProducts.length > 0 ? (
                    <FlatList
                      nestedScrollEnabled
                      data={filteredProducts}
                      renderItem={renderItem}
                      keyExtractor={item => item.id.toString()}
                      numColumns={numColumns}
                      contentContainerStyle={{
                        padding: 20,
                        alignItems: 'center',
                      }}
                      columnWrapperStyle={{justifyContent: 'flex-start'}}
                      key={`filtered-${numColumns}`}
                    />
                  ) : (
                    <View style={styles.noResultContainer}>
                      <Text>{t('No result found!')}</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {search.length === 0 && !filter && (
              <View style={{marginTop: 10, alignItems: 'center'}}>
                {ads.length > 0 && (
                  <View>
                    <AdSlider paidAds={ads} />
                  </View>
                )}

                {isAuth && Recent?.length > 0 && (
                  <View style={{marginTop: 25, width: '100%'}}>
                    <View style={[styles.headerSubSection, {padding: 16}]}>
                      <Text style={styles.welcome}>{t('Recent Booking')}</Text>
                      <TouchableOpacity onPress={goView_all2}>
                        <Text style={styles.viewAllText}>{t('View all')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.recentListContainer}>
                      {Recent.map(item => (
                        <TouchableOpacity
                          key={item.id}
                          style={{
                            width: itemWidth,
                            marginBottom: 20,
                            marginRight: itemMargin,
                            alignItems: 'center',
                            padding: 5,
                          }}
                          onPress={() => handleGoSalon(item?.id)}>
                          <Image
                            source={{uri: item.images.logo}}
                            style={{
                              width: Math.min(itemWidth - 10, 72),
                              height: Math.min(itemWidth - 10, 72),
                              borderRadius: 50,
                            }}
                            resizeMode="cover"
                          />
                          <Text
                            style={[
                              styles.name,
                              {
                                textAlign: 'center',
                                marginTop: 8,
                                width: '100%',
                              },
                            ]}>
                            {isRTL ? item.name_ar : item.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={{padding: 16, width: '98%'}}>
                  <View style={styles.headerSubSection}>
                    <Text style={styles.welcome}>{t('Salons')}</Text>
                    <TouchableOpacity onPress={goView_all}>
                      <Text style={styles.viewAllText}>{t('View all')}</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    nestedScrollEnabled
                    data={Salon}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    numColumns={numColumns}
                    contentContainerStyle={{
                      padding: 20,
                      alignItems: 'center',
                    }}
                    columnWrapperStyle={{justifyContent: 'flex-start'}}
                    key={`salon-${numColumns}`}
                  />
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
    // paddingHorizontal: 10,
  },
  headerContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
  },
  recentListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 18,
    marginTop: 5,
    fontWeight: '600',
  },
  title2: {
    fontSize: 18,
    color: '#fff',
  },
  searchFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    flexWrap: 'nowrap',
  },
  searchBar: {
    height: 40,
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    paddingHorizontal: 15,
    marginVertical: 10,
    backgroundColor: '#fff',
    maxWidth: 450,
  },
  searchText: {
    fontSize: 14,
    color: Colors.black3,
    marginLeft: 5,
  },
  filter: {
    width: 40,
    height: 40,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: 3,
    backgroundColor: '#fff',
    maxWidth: 40,
    maxHeight: 40,
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
  modalContentWrapper: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexGrow: 1,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignSelf: 'center',
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
    fontSize: 19,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'left',
    width: '100%',
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '300',
  },
  name: {
    fontSize: 12,
    color: Colors.black1,
    flexShrink: 1,
  },
  name1: {
    fontSize: 14,
    color: Colors.black1,
    marginTop: 5,
    marginHorizontal: 5,
    alignSelf: 'flex-start',
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
  cartIcon: {
    padding: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c7a88a',
    backgroundColor: 'white',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: '#c7a88a',
  },
  chipText: {
    color: '#000',
    fontSize: 14,
  },
  selectedText: {
    color: '#fff',
  },
  priceInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    width: '100%',
  },
  priceInput: {
    height: 50,
    width: '45%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
  },
  noResultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 100,
  },
});

export default Home;
