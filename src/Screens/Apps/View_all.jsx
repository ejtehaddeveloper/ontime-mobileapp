/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState, useCallback, useMemo} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  SafeAreaView,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import hostImge from '../../context/hostImge';
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
import {SearchBar, SalonGridItem} from '../../components/home/index';

const isRTLglobal = i18n.language === 'ar';
I18nManager.forceRTL(isRTLglobal);

const View_all = () => {
  const navigation = useNavigation();
  const {width, height} = useWindowDimensions();

  // Layout constants
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
  const searchBarWidth = Math.min(width * 0.8, 450);

  // UI & filter state
  const [isFilterVisible, setFilterVisible] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [Services, setServices] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [min, setMin] = useState(null);
  const [max, setMax] = useState(null);

  // Data lists & loading
  const [serviceList, setServiceList] = useState([]);
  const [addressList, setAddressList] = useState([]);
  const [salons, setSalons] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Search input
  const [search, setSearch] = useState('');

  // Derived filter params
  const [is_popular, setIs_popular] = useState(null);
  const [price_sort, setprice_sort] = useState(null);
  const [isServices, setisServices] = useState(null);

  const sortingOptions = useMemo(
    () => [
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
    ],
    [],
  );

  // ------------------ Helpers (self-contained) ------------------
  const buildImageUri = (host, logoPath) => {
    if (!logoPath) return null;
    const path = String(logoPath);
    if (/^https?:\/\//i.test(path)) return path;
    if (!host) return path;
    return `${host.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  };

  const preloadImages = (items = [], {limit = 30} = {}) => {
    try {
      if (!Array.isArray(items) || items.length === 0) return;
      const sources = items
        .map(it =>
          buildImageUri(hostImge, it?.images?.logo || it?.logo || it?.image),
        )
        .filter(Boolean)
        .slice(0, limit)
        .map(uri => ({uri, priority: FastImage.priority.normal}));
      if (sources.length) FastImage.preload(sources);
    } catch (err) {
      console.warn('preloadImages error', err);
    }
  };

  // ------------------ Data fetching ------------------
  const fetchPage = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const Data = await getViewAll(page);
      const pageData = Data?.data || [];
      setSalons(pageData);
      setTotalPages(Data?.pagination?.last_page || 1);

      // Preload thumbnails for first visible rows
      preloadImages(pageData, {limit: 30});
    } catch (err) {
      console.log('getViewAll error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(currentPage);
  }, [fetchPage, currentPage]);

  useEffect(() => {
    let mounted = true;
    const fetchServices = async () => {
      try {
        const Data = await getFilterService();
        if (!mounted) return;
        setServiceList(Data || []);
      } catch (err) {
        console.log('getFilterService error', err);
      }
    };

    const fetchAddresses = async () => {
      try {
        const Data = await getAddress();
        if (!mounted) return;
        setAddressList(Data || []);
      } catch (err) {
        console.log('getAddress error', err);
      }
    };

    fetchServices();
    fetchAddresses();

    return () => {
      mounted = false;
    };
  }, []);

  // ------------------ Search (debounced) ------------------
  useEffect(() => {
    let mounted = true;
    if (!search || search.length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const id = setTimeout(async () => {
      try {
        const data = await getSearch(search);
        if (!mounted) return;
        setSearchResults(data || []);
        preloadImages(data || [], {limit: 30});
      } catch (err) {
        console.log('search error', err);
      } finally {
        if (mounted) setIsSearching(false);
      }
    }, 450);

    return () => {
      mounted = false;
      clearTimeout(id);
    };
  }, [search]);

  // ------------------ Filters derived ------------------
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

  const handleCloseFilter = useCallback(async () => {
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
        setFilteredProducts(Data || []);
        setFilterActive(true);
        preloadImages(Data || [], {limit: 30});
      } catch (err) {
        console.log('getFilter error', err);
      } finally {
        setFilterVisible(false);
      }
    } else {
      setFilterActive(false);
      setFilterVisible(false);
    }
  }, [
    Services,
    selectedLocation,
    selectedOptions,
    min,
    max,
    isServices,
    price_sort,
    is_popular,
  ]);

  const resetFilters = useCallback(() => {
    setSelectedLocation(null);
    setServices([]);
    setSelectedOptions([]);
    setMin(null);
    setMax(null);
    setFilterActive(false);
    setFilteredProducts([]);
    setFilterVisible(false);
  }, []);

  // ------------------ Handlers ------------------
  const handleFilterToggleLocation = useCallback(location => {
    setSelectedLocation(prev => (prev === location ? null : location));
  }, []);

  const handleToggleService = useCallback(s => {
    setServices(prev =>
      prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s],
    );
  }, []);

  const toggleSelection = useCallback(
    option => {
      setSelectedOptions(prev =>
        option.exclusive
          ? prev.includes(option.id)
            ? prev.filter(id => id !== option.id)
            : [
                ...prev.filter(
                  id => !sortingOptions.find(o => o.exclusive && o.id === id),
                ),
                option.id,
              ]
          : prev.includes(option.id)
          ? prev.filter(id => id !== option.id)
          : [...prev, option.id],
      );
    },
    [sortingOptions],
  );

  const handleGoSalon = useCallback(
    salonId => navigation.navigate('Salon', {salonId}),
    [navigation],
  );
  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  // ------------------ Renderers ------------------
  const renderSalonItem = useCallback(
    ({item}) => (
      <SalonGridItem
        item={item}
        size={itemWidth}
        onPress={handleGoSalon}
        isRTL={isRTLglobal}
      />
    ),
    [itemWidth, handleGoSalon],
  );

  const salonKeyExtractor = useCallback(item => String(item.id), []);

  // Header for the main list
  const HomeListHeader = useMemo(() => {
    return (
      <View>
        <View style={{padding: 16}}>
          <View style={styles.headerSubSection}>
            <Text style={styles.welcome}>{t('Salons')}</Text>
          </View>
        </View>
      </View>
    );
  }, []);

  // Active list selection (only one large vertical FlatList mounted at a time)
  const ActiveList = useMemo(() => {
    // Searching
    if (search && search.length > 0) {
      if (isSearching) return <Loading />;
      if (!searchResults || searchResults.length === 0)
        return (
          <View style={styles.noResultContainer}>
            <Text>{t('No result found!')}</Text>
          </View>
        );

      return (
        <FlatList
          style={{flex: 1}}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          data={searchResults}
          renderItem={renderSalonItem}
          keyExtractor={salonKeyExtractor}
          numColumns={numColumns}
          contentContainerStyle={{
            padding: 15,
            alignItems: width < 480 ? 'center' : 'flex-start',
          }}
          columnWrapperStyle={{justifyContent: 'flex-start'}}
        />
      );
    }

    // Filters active
    if (filterActive) {
      if (!filteredProducts || filteredProducts.length === 0)
        return (
          <View style={styles.noResultContainer}>
            <Text>{t('No result found!')}</Text>
          </View>
        );

      return (
        <FlatList
          style={{flex: 1}}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          data={filteredProducts}
          renderItem={renderSalonItem}
          keyExtractor={salonKeyExtractor}
          numColumns={numColumns}
          contentContainerStyle={{
            padding: 15,
            alignItems: width < 480 ? 'center' : 'flex-start',
          }}
          columnWrapperStyle={{justifyContent: 'flex-start'}}
        />
      );
    }

    // Default: paginated main list
    return (
      <FlatList
        style={{flex: 1}}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        data={salons}
        renderItem={renderSalonItem}
        keyExtractor={salonKeyExtractor}
        numColumns={numColumns}
        contentContainerStyle={{paddingBottom: 40, paddingHorizontal: 10}}
        columnWrapperStyle={{justifyContent: 'center'}}
        ListHeaderComponent={HomeListHeader}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={11}
        removeClippedSubviews={true}
      />
    );
  }, [
    search,
    isSearching,
    searchResults,
    filterActive,
    filteredProducts,
    salons,
    renderSalonItem,
    salonKeyExtractor,
    HomeListHeader,
    width,
  ]);

  // ------------------ Render ------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Fixed header row: back button + search */}
        <View style={styles.fixedHeader}>
          <View
            style={[
              styles.topRow,
              {flexDirection: isRTLglobal ? 'row-reverse' : 'row'},
            ]}>
            <TouchableOpacity
              onPress={handleGoBack}
              style={styles.backButton}
              accessibilityRole="button">
              <Ionicons
                name={i18n.language === 'en' ? 'arrow-back' : 'arrow-forward'}
                size={24}
              />
            </TouchableOpacity>
          </View>
        </View>
        <SearchBar
          value={search}
          onChange={setSearch}
          onOpenFilter={() => setFilterVisible(true)}
          maxWidth={searchBarWidth}
        />
        {/* Active content */}
        <View style={{flex: 1}}>{ActiveList}</View>

        {/* Pagination for main list */}
        {!search && !filterActive && totalPages > 1 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              disabled={currentPage === 1}
              onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={[
                styles.pageButton,
                currentPage === 1 && styles.pageButtonDisabled,
              ]}>
              <Ionicons
                name={
                  i18n.language === 'en' ? 'chevron-back' : 'chevron-forward'
                }
                size={22}
                color="#fff"
              />
            </TouchableOpacity>

            <Text style={styles.pageInfo}>
              {currentPage} {t('of')} {totalPages}
            </Text>

            <TouchableOpacity
              disabled={currentPage >= totalPages}
              onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={[
                styles.pageButton,
                currentPage >= totalPages && styles.pageButtonDisabled,
              ]}>
              <Ionicons
                name={
                  i18n.language === 'en' ? 'chevron-forward' : 'chevron-back'
                }
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Filter modal (75% height) */}
        <Modal
          visible={isFilterVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setFilterVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={{flex: 1}}
              activeOpacity={1}
              onPress={() => setFilterVisible(false)}
            />

            <View
              style={[
                styles.modalContent,
                {height: Math.min(height * 0.75, 720)},
              ]}>
              <ScrollView
                contentContainerStyle={{padding: 20}}
                keyboardShouldPersistTaps="handled">
                <TouchableOpacity
                  style={styles.clearFilter}
                  onPress={resetFilters}>
                  <Text style={styles.clearFilterText}>{t('Clear')}</Text>
                </TouchableOpacity>

                <Text
                  style={[
                    styles.title,
                    {textAlign: isRTLglobal ? 'right' : 'left'},
                  ]}>
                  {t('Services')}
                </Text>
                <View style={styles.chipContainer}>
                  {serviceList.map(svc => {
                    const id = svc.uuid || svc.id;
                    const isSelected = Services.includes(id);
                    return (
                      <TouchableOpacity
                        key={id}
                        onPress={() => handleToggleService(id)}
                        style={[
                          styles.chip,
                          isSelected && styles.selectedChip,
                        ]}>
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.selectedText,
                          ]}>
                          {isRTLglobal
                            ? svc.name_ar || svc.service_ar
                            : svc.name || svc.service}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text
                  style={[
                    styles.title,
                    {marginTop: 16, textAlign: isRTLglobal ? 'right' : 'left'},
                  ]}>
                  {t('Address')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginTop: 8,
                  }}>
                  {addressList.map(addr => {
                    const isSelected = selectedLocation === addr.id;
                    return (
                      <TouchableOpacity
                        key={addr.id}
                        style={[styles.chip, isSelected && styles.selectedChip]}
                        onPress={() => handleFilterToggleLocation(addr.id)}>
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.selectedText,
                          ]}>
                          <Ionicons
                            name="location"
                            size={14}
                            color={isSelected ? '#fff' : Colors.black3}
                          />{' '}
                          {isRTLglobal ? addr.city_ar : addr.city}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{paddingVertical: 20}}>
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
                      style={styles.sortRow}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: selectedOptions.includes(option.id)
                            ? 'bold'
                            : 'normal',
                        }}>
                        {option.label2}
                      </Text>
                      <View style={styles.checkbox}>
                        {selectedOptions.includes(option.id) && (
                          <View style={styles.checkboxInner} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text
                  style={[
                    styles.title,
                    {textAlign: isRTLglobal ? 'right' : 'left'},
                  ]}>
                  {t('Price')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 12,
                  }}>
                  <TextInput
                    placeholder={t('Min')}
                    value={min}
                    onChangeText={setMin}
                    style={styles.priceInput}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.black3}
                  />
                  <TextInput
                    placeholder={t('Max')}
                    value={max}
                    onChangeText={setMax}
                    style={styles.priceInput}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.black3}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, {marginTop: 28}]}
                  onPress={handleCloseFilter}>
                  <Text style={styles.title2}>{t('Search')}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  fixedHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  topRow: {alignItems: 'center', gap: 10},
  backButton: {padding: 6},
  headerSubSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  title: {fontSize: 18, marginTop: 5, fontWeight: '600'},
  title2: {fontSize: 18, color: '#fff', textAlign: 'center'},
  chipContainer: {
    flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c7a88a',
    backgroundColor: 'white',
    margin: 6,
  },
  selectedChip: {backgroundColor: '#c7a88a'},
  chipText: {color: '#000', fontSize: 14},
  selectedText: {color: '#fff'},
  clearFilter: {
    width: 60,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  clearFilterText: {fontSize: 12, color: Colors.primary},
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#C2A68B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: '#C2A68B',
    borderRadius: 3,
  },
  priceInput: {
    height: 50,
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  button: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 80,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pageButton: {
    padding: 10,
    marginHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#C2A68B',
  },
  pageButtonDisabled: {backgroundColor: '#ccc'},
  pageInfo: {fontSize: 16},
});

export default View_all;
