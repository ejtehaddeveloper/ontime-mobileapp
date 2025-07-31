/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
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
  SafeAreaView,
  I18nManager,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {useNavigation} from '@react-navigation/native';
import Loading from '../../assets/common/Loading';
import {
  getAddress,
  getFilter,
  getFilterService,
  getSearch,
  getViewAll,
} from '../../context/api';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';

const isRTL = i18n.language === 'ar';
I18nManager.forceRTL(isRTL);

const View_all = () => {
  const navigation = useNavigation();
  const {width, height} = useWindowDimensions();

  const searchBarWidth = width * 0.78;
  const numColumns = 3;

  const [isFilterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [Services, setServices] = useState([]);
  //
  const [search, setSearch] = useState('');
  const [max, setMax] = useState(null);
  const [min, setMin] = useState(null);
  const [service, setService] = useState([]);
  const [address, setAddress] = useState([]);
  const [salons, setSalons] = useState([]);
  const [SarFind, setSarFind] = useState([]);
  const [loading, setloading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const isRTL = i18n.language === 'ar';

  const [is_popular, setIs_popular] = useState(false);
  const [price_sort, setprice_sort] = useState(null);
  const [filteredProducts, setfilteredProducts] = useState(null);
  const [isServices, setisServices] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  //

  const Salon = salons;
  const filterD = address;
  const filteredData = SarFind;

  const sortingOptions = [
    {id: 1, label: 'Most Popular', label2: t('Most Popular')},
    {id: 2, label: 'Customer Review', label2: t('Customer Review')},
    {
      id: 3,
      label: 'Cost Low to High',
      label2: t('Cost Low to High'),
      exclusive: true,
    },
    {
      id: 4,
      label: 'Cost High to Low',
      label2: t('Cost High to Low'),
      exclusive: true,
    },
  ];

  const handleGoSalon = salonId => {
    navigation.navigate('Salon', {salonId});
  };

  const fetchData = async (page = 1) => {
    console.log('iiiiiiiiihhhhhhhhhhhh');
    setloading(true);
    try {
      const Data = await getViewAll(page);
      // if (Data && Data.data) {
      setSalons(Data?.data);
      setTotalPages(Data?.pagination?.last_page);
      console.log('iiiiiiiiiiiiiiiiiiiiii', Data?.pagination?.last_page);
      // }
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      setloading(false);
    }
  };

  useEffect(() => {
    if (currentPage) {
      fetchData(currentPage);
    }
  }, [currentPage]);

  useEffect(() => {
    const fetchservices = async () => {
      try {
        const Data = await getFilterService();
        setService(Data);
      } catch (error) {
        console.log('Error fetching data getFilterService:', error);
      } finally {
        setloading(false);
      }
    };

    fetchservices();
    const fetchaddress = async () => {
      try {
        const Data = await getAddress();
        setAddress(Data);
      } catch (error) {
        console.log('Error fetching data getAddress:', error);
      } finally {
        setloading(false);
      }
    };

    fetchaddress();
  }, []);

  const renderAddress = ({item}) => {
    const isSelected = selectedLocation === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.chip,
          isSelected && styles.selectedChip,
        ]}
        onPress={() => handleFilter(item.id)}>
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
          {isRTL ? item.city_ar : item.city}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleFilter = location => {
    setSelectedLocation(location === selectedLocation ? null : location);
  };

  const renderService = ({item}) => {
    const isSelected = Array.isArray(Services) && Services.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            backgroundColor: isSelected ? Colors.primary : 'white',
            borderColor: Colors.primary,
            flex: 1,
            minWidth: width / 4,
            maxWidth: width / 3,
            marginHorizontal: 4,
          },
        ]}
        onPress={() => handleService(item.id)}>
        <Text
          style={[
            styles.itemText,
            {color: isSelected ? 'white' : Colors.black3},
            {fontSize: width < 360 ? 12 : 16},
          ]}>
          {isRTL ? item.service_ar : item.service}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleService = serves => {
    setServices(prevSelected => {
      if (prevSelected.includes(serves)) {
        return prevSelected.filter(item => item !== serves);
      } else {
        return [...prevSelected, serves];
      }
    });
  };

  const fetchSearch = async () => {
    if (search.length === 0) {
      return;
    }
    setIsLoading(true);
    try {
      const data = await getSearch(search);
      setSarFind(data);
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
          source={{uri: `${hostImge}${item?.images?.logo}`}}
          style={{
            width: Math.min(itemWidth - 10, 72),
            height: Math.min(itemWidth - 10, 72),
            borderRadius: 50,
          }}
          resizeMode="cover"
        />
        <Text style={[styles.name, {textAlign: 'center', marginTop: 8}]}>
          {i18n.language === 'ar' ? item?.name_ar : item?.name}
        </Text>
      </TouchableOpacity>
    );
  };

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
    setSelectedLocation(null);
    setServices([]);
    setSelectedOptions([]);
    setMin(null);
    setMax(null);
    setFilter(false);
    setfilteredProducts(null);
    setFilterVisible(false);
  };

  const handleGoBack = () => navigation.goBack();

  console.log('hhhhhhhhhhhhhhhhhhhhhhhhh', isRTL);

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
              <View
                style={{
                  padding: 16,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                }}>
                <Ionicons
                  name={i18n.language === 'en' ? 'arrow-back' : 'arrow-forward'}
                  size={25}
                  onPress={handleGoBack}
                />
              </View>
            )}
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingLeft: 16,
                  paddingRight: 16,
                  flexWrap: 'wrap',
                  direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
                }}>
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
                    style={[styles.searchText, {flex: 1}]}
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
                transparent={true}
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
                        <Text style={[styles.title,{ textAlign: isRTL ? 'right' : 'left' }]}>{t('Services')}</Text>
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
                        <Text style={[styles.title,{ textAlign: isRTL ? 'right' : 'left' }]}>{t('Address')}</Text>
                        <FlatList
                          nestedScrollEnabled={true}
                          data={filterD}
                          renderItem={renderAddress}
                          keyExtractor={item => item.id.toString()}
                          numColumns={width < 480 ? 2 : 3}
                          contentContainerStyle={{padding: 5}}
                        />
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
                        <Text style={[styles.title,{ textAlign: isRTL ? 'right' : 'left' }]}>{t('Price')}</Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-around',
                            marginTop: 15,
                            width: '100%',
                          }}>
                          <TextInput
                            placeholder={t('Max')}
                            value={max}
                            onChangeText={value => setMax(value)}
                            style={{
                              height: 50,
                              width: width * 0.35,
                              borderWidth: 1,
                              borderRadius: 12,
                              padding: 15,
                            }}
                            keyboardType="phone-pad"
                            placeholderTextColor={Colors.black3}
                          />
                          <TextInput
                            placeholder={t('Min')}
                            value={min}
                            onChangeText={value => setMin(value)}
                            style={{
                              height: 50,
                              width: width * 0.35,
                              borderWidth: 1,
                              borderRadius: 12,
                              padding: 15,
                            }}
                            keyboardType="phone-pad"
                            placeholderTextColor={Colors.black3}
                          />
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.button,
                          {width: width * 0.8, marginVertical: 30},
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
                          nestedScrollEnabled={true}
                          data={filteredData}
                          renderItem={renderItem}
                          keyExtractor={item => item.id.toString()}
                          numColumns={numColumns}
                          contentContainerStyle={{
                            padding: 15,
                            alignItems: width < 480 ? 'center' : 'flex-start',
                          }}
                          key={`list-${numColumns}`}
                        />
                      ) : (
                        <View
                          style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: 100,
                          }}>
                          <Text>{t('No result found!')}</Text>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
              {filter && (
                <FlatList
                  nestedScrollEnabled={true}
                  data={filteredProducts}
                  renderItem={renderItem}
                  keyExtractor={item => item.id.toString()}
                  numColumns={numColumns}
                  contentContainerStyle={{
                    padding: 15,
                    alignItems: width < 480 ? 'center' : 'flex-start',
                  }}
                  key={`filtered-${numColumns}`}
                />
              )}
            </View>
            {search.length === 0 && !filter && (
              <View style={{marginTop: 10, alignItems: 'center'}}>
                <View style={{padding: 16, width: '100%'}}>
                  <Text style={styles.welcome}>{t('Salons')}</Text>
                  <FlatList
                    nestedScrollEnabled={true}
                    data={Salon}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    numColumns={numColumns}
                    contentContainerStyle={{
                      padding: 5,
                      alignItems: width < 480 ? 'center' : 'flex-start',
                    }}
                    key={`salon-${numColumns}`}
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
                          backgroundColor:
                            currentPage === 1 ? '#ccc' : '#C2A68B',
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
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 18,
    marginTop: 5,
    fontWeight: '600',
    // textAlign: isRTL ? 'right' : 'left',
  },
  title2: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  searchBar: {
    height: 40,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    paddingHorizontal: 15,
    marginVertical: 10,
    backgroundColor: '#fff',
  },
  searchText: {
    fontSize: 14,
    color: Colors.black3,
    marginHorizontal: 5,
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
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
  chipContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: isRTL ? 'flex-end' : 'flex-start',
  },
  chipText: {
    color: '#000',
    fontSize: 14,
    textAlign: isRTL ? 'right' : 'left',
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
  welcome: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: isRTL ? 'right' : 'left',
    width: '100%',
  },
  itemText: {
    marginHorizontal: 5,
    fontSize: 14,
    textAlign: isRTL ? 'right' : 'left',
  },
  modalContentWrapper: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexGrow: 1,
    paddingLeft: isRTL ? 20 : 10,
    paddingRight: isRTL ? 10 : 20,
    flexDirection: isRTL ? 'row-reverse' : 'row',
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
});

export default View_all;
