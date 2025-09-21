/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';

const SearchBar = ({value, onChange, onOpenFilter}) => {
  const {width} = useWindowDimensions();
  const searchBarWidth = Math.min(width * 0.8, 450);

  return (
    <View style={styles.searchFilterContainer}>
      <View style={[styles.searchBar, {width: searchBarWidth}]}>
        <Ionicons name="search-outline" size={18} color={Colors.primary} />
        <TextInput
          placeholder={t('Search here')}
          value={value}
          onChangeText={onChange}
          style={[styles.searchText]}
          placeholderTextColor={Colors.primary}
        />
      </View>
      <View style={{flexDirection: 'column', alignItems: 'center'}}>
        <TouchableOpacity style={styles.filter} onPress={onOpenFilter}>
          <Ionicons name="filter-outline" size={25} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default React.memo(SearchBar);
