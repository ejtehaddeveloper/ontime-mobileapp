import {useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
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
import {Colors} from '../../assets/constants';
import {Header, SearchBar, SalonGridItem} from '../../components/home/index';
import FilterModal from '../../components/home/filtermodal';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import preloadImages from '../../helpers/preloadimages';
const Home = () => {
  const {isAuth} = useContext(AuthContext);
  const navigation = useNavigation();
  const {width} = useWindowDimensions();

  const numColumns = useMemo(() => (width >= 768 ? 4 : 3), [width]);
  const sidePadding = 20;
  const itemMargin = 15;
  const itemWidth = useMemo(
    () =>
      Math.floor(
        (width - sidePadding * 2 - itemMargin * (numColumns - 1)) / numColumns,
      ),
    [width, numColumns],
  );

  const searchBarWidth = Math.min(width * 0.8, 450);

  // UI state
  const [isFilterVisible, setFilterVisible] = useState(false);
  const [filterActive, setFilterActive] = useState(false);

  // Filters / selections
  const [selectedLocation, setSelectedLocation] = useState([]);
  const [Services, setServices] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [min, setMin] = useState(null);
  const [max, setMax] = useState(null);

  // Data lists
  const [serviceList, setServiceList] = useState([]);
  const [addressList, setAddressList] = useState([]);
  const [ads, setAds] = useState([]);
  const [cart, setCart] = useState([]);
  const [recent, setRecent] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [salons, setSalons] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  // Loading flags
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Other derived
  const isRTL = i18n.language === 'ar';

  const sortingOptions = useMemo(
    () => [
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
    ],
    [],
  );

  // Debounced search input
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 450);

  // Sorting/filter derived values
  const [is_popular, setIs_popular] = useState(null);
  const [price_sort, setprice_sort] = useState(null);
  const [isServices, setisServices] = useState(null);

  // -------------------- Data fetching --------------------
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        if (isAuth) {
          const Data = await getHomewi();
          if (!mounted) return;

          const recentAppointments = Data?.recent_appointments || [];
          const salonsData = Data?.salons || [];
          const banners = Data?.banners || [];

          setRecent(recentAppointments);
          setSalons(salonsData);
          setAds(banners);

          preloadImages(salonsData, {limit: 30});
          preloadImages(recentAppointments, {limit: 15});

          const bannerItems = (banners || []).map(b => ({
            images: {logo: b?.image || b?.logo || b?.src || b?.thumb},
          }));
          preloadImages(bannerItems, {limit: 10});
        } else {
          const Data = await getHome();
          if (!mounted) return;

          const salonsData = Data?.salons || [];
          const banners = Data?.banners || [];

          setSalons(salonsData);
          setAds(banners);

          // PRELOAD images
          preloadImages(salonsData, {limit: 30});

          const bannerItems = (banners || []).map(b => ({
            images: {logo: b?.image || b?.logo || b?.src || b?.thumb},
          }));
          preloadImages(bannerItems, {limit: 10});
        }
      } catch (err) {
        console.log('Home fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

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

    if (isAuth) {
      fetchUser();
    }

    fetchData();
    fetchServices();
    fetchAddresses();

    return () => {
      mounted = false;
    };
  }, [isAuth]);

  const fetchUser = useCallback(async () => {
    try {
      const Data = await getusers();
      setUserInfo(Data);
    } catch (err) {
      console.log('Error fetching user:', err);
    }
  }, []);

  const fetchCart = useCallback(async () => {
    try {
      const Data = await getCart();
      setCart(Data.data || []);
    } catch (err) {
      console.log('Error fetching cart:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart]),
  );

  // -------------------- Search logic --------------------
  useEffect(() => {
    let mounted = true;
    const performSearch = async () => {
      if (!debouncedSearch || debouncedSearch.length === 0) {
        setSearchResults(data || []);
        preloadImages(data || [], {limit: 25});
        return;
      }
      setIsSearching(true);
      try {
        const data = await getSearch(debouncedSearch);
        if (!mounted) return;
        setSearchResults(data || []);
        preloadImages(data || [], {limit: 25});
      } catch (err) {
        console.log('Search error', err);
      } finally {
        if (mounted) setIsSearching(false);
      }
    };
    performSearch();
    return () => {
      mounted = false;
    };
  }, [debouncedSearch]);

  // -------------------- Filter logic --------------------
  useEffect(() => {
    setIs_popular(selectedOptions.includes(1) ? true : null);
    setisServices(Services.length > 0 ? Services.join(',') : null);

    if (selectedOptions.includes(3)) {
      setprice_sort('desc');
    } else if (selectedOptions.includes(2)) {
      setprice_sort('asc');
    } else {
      setprice_sort(null);
    }
  }, [selectedOptions, Services]);

  const handleCloseFilter = useCallback(async () => {
    if (
      selectedLocation.length !== 0 ||
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
        preloadImages(Data || [], {limit: 30});
        setFilterActive(true);
        setFilterVisible(false);
      } catch (err) {
        console.log('getFilter error', err);
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
    setSelectedLocation([]);
    setServices([]);
    setSelectedOptions([]);
    setMin(null);
    setMax(null);
    setFilterActive(false);
    setFilteredProducts([]);
    setFilterVisible(false);
  }, []);

  const toggleSelection = useCallback(option => {
    setSelectedOptions(prev =>
      prev.includes(option.id)
        ? prev.filter(id => id !== option.id)
        : [...prev, option.id],
    );
  }, []);

  const handleFilterToggleLocation = useCallback(location => {
    setSelectedLocation(prev =>
      prev.includes(location)
        ? prev.filter(i => i !== location)
        : [...prev, location],
    );
  }, []);

  const handleToggleService = useCallback(s => {
    setServices(prev =>
      prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s],
    );
  }, []);

  // -------------------- Navigation handlers --------------------
  const handleGoSalon = useCallback(
    salonId => navigation.navigate('Salon', {salonId}),
    [navigation],
  );
  const handleGoCart = useCallback(
    () => navigation.navigate('Cart'),
    [navigation],
  );
  const goView_all = useCallback(
    () => navigation.navigate('View_all'),
    [navigation],
  );
  const goView_all2 = useCallback(
    () => navigation.navigate('View_all2'),
    [navigation],
  );

  // -------------------- Renderers --------------------
  const renderSalonItem = useCallback(
    ({item}) => (
      <SalonGridItem
        item={item}
        size={itemWidth}
        onPress={handleGoSalon}
        isRTL={isRTL}
      />
    ),
    [itemWidth, handleGoSalon, isRTL],
  );

  const salonKeyExtractor = useCallback(item => String(item.id), []);

  // -------------------- Conditional lists --------------------
  const SearchResultsComponent = useMemo(() => {
    if (debouncedSearch && debouncedSearch.length > 0) {
      if (isSearching) return <Loading />;
      if (searchResults.length === 0)
        return (
          <View style={styles.noResultContainer}>
            <Text>{t('No result found!')}</Text>
          </View>
        );

      return (
        <FlatList
          data={searchResults}
          renderItem={renderSalonItem}
          keyExtractor={salonKeyExtractor}
          numColumns={numColumns}
          contentContainerStyle={{padding: 20, alignItems: 'center'}}
          columnWrapperStyle={{justifyContent: 'flex-start'}}
          key={`search-${numColumns}`}
        />
      );
    }
    return null;
  }, [
    debouncedSearch,
    isSearching,
    searchResults,
    renderSalonItem,
    salonKeyExtractor,
    numColumns,
  ]);

  const FilterResultsComponent = useMemo(() => {
    if (filterActive) {
      if (filteredProducts.length === 0)
        return (
          <View style={styles.noResultContainer}>
            <Text>{t('No result found!')}</Text>
          </View>
        );

      return (
        <FlatList
          data={filteredProducts}
          renderItem={renderSalonItem}
          keyExtractor={salonKeyExtractor}
          numColumns={numColumns}
          contentContainerStyle={{padding: 20, alignItems: 'center'}}
          columnWrapperStyle={{justifyContent: 'flex-start'}}
          key={`filtered-${numColumns}`}
        />
      );
    }
    return null;
  }, [
    filterActive,
    filteredProducts,
    renderSalonItem,
    salonKeyExtractor,
    numColumns,
  ]);
  useEffect(() => {
    if (recent.length > 0) {
      console.log('Recent appointments:', recent);
    }
  }, [recent]);
  const MainListComponent = useMemo(
    () => (
      <FlatList
        data={salons}
        renderItem={renderSalonItem}
        keyExtractor={salonKeyExtractor}
        numColumns={numColumns}
        contentContainerStyle={{paddingBottom: 40}}
        columnWrapperStyle={{justifyContent: 'center'}}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={11}
        removeClippedSubviews={true}
        key={`salon-${numColumns}`}
        ListHeaderComponent={
          <>
            {ads.length > 0 && (
              <View style={{paddingHorizontal: 16, marginTop: 10}}>
                <AdSlider paidAds={ads} />
              </View>
            )}

            {isAuth && recent.length > 0 && (
              <View style={{marginTop: 20}}>
                <View
                  style={[styles.headerSubSection, {paddingHorizontal: 16}]}>
                  <Text style={styles.welcome}>{t('Recent Booking')}</Text>
                  <Text style={styles.viewAllText} onPress={goView_all2}>
                    {t('View all')}
                  </Text>
                </View>

                <FlatList
                  data={recent}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={it => String(it.id)}
                  renderItem={({item}) => (
                    <SalonGridItem
                      item={item}
                      size={itemWidth}
                      onPress={handleGoSalon}
                      isRTL={isRTL}
                    />
                  )}
                  contentContainerStyle={{paddingHorizontal: 16}}
                  style={{marginTop: 8}}
                />
              </View>
            )}

            <View style={{padding: 16}}>
              <View style={styles.headerSubSection}>
                <Text style={styles.welcome}>{t('Salons')}</Text>
                <Text style={styles.viewAllText} onPress={goView_all}>
                  {t('View all')}
                </Text>
              </View>
            </View>
          </>
        }
      />
    ),
    [
      salons,
      renderSalonItem,
      salonKeyExtractor,
      numColumns,
      ads,
      recent,
      goView_all,
      goView_all2,
      itemWidth,
      handleGoSalon,
      isAuth,
      isRTL,
    ],
  );

  // -------------------- Loading --------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header + SearchBar always visible */}
      <Header
        userInfo={userInfo}
        isAuth={isAuth}
        cartLength={cart.length}
        onCartPress={handleGoCart}
      />
      <SearchBar
        value={search}
        onChange={setSearch}
        onOpenFilter={() => setFilterVisible(true)}
        maxWidth={searchBarWidth}
      />

      {debouncedSearch && debouncedSearch.length > 0
        ? SearchResultsComponent
        : filterActive
        ? FilterResultsComponent
        : MainListComponent}

      <FilterModal
        visible={isFilterVisible}
        onClose={() => setFilterVisible(false)}
        services={serviceList}
        addresses={addressList}
        selectedLocation={selectedLocation}
        onToggleLocation={handleFilterToggleLocation}
        selectedServices={Services}
        onToggleService={handleToggleService}
        sortingOptions={sortingOptions}
        selectedOptions={selectedOptions}
        toggleSelection={toggleSelection}
        min={min}
        max={max}
        setMin={setMin}
        setMax={setMax}
        onApply={handleCloseFilter}
        onReset={resetFilters}
        windowWidth={width}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  headerSubSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {fontSize: 19, fontWeight: '600', marginBottom: 8},
  viewAllText: {fontSize: 14, color: Colors.primary, fontWeight: '300'},
  noResultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 100,
  },
});

export default Home;
