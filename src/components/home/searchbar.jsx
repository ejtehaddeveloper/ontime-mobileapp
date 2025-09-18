/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';
const SearchBar = ({value, onChange, onOpenFilter, maxWidth}) => (
  <View style={styles.searchFilterContainer}>
    <View style={[styles.searchBar]}>
      <Ionicons name="search-outline" size={18} color={Colors.primary} />
      <TextInput
        placeholder={t('Search here')}
        value={value}
        onChangeText={onChange}
        style={[
          styles.searchText,
          i18n.language === 'ar' &&
            Platform.OS === 'ios' && {textAlign: 'right'},
        ]}
        placeholderTextColor={Colors.primary}
      />
    </View>
    <TouchableOpacity style={styles.filter} onPress={onOpenFilter}>
      <Ionicons name="filter-outline" size={25} color={Colors.primary} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  searchFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 5,
  },
  searchBar: {
    flex: 0.9,
    height: 40,
    flexDirection: 'row',
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
    marginLeft: 5,
    flex: 1,
  },
  filter: {
    flex: 0.1,
    width: 44,
    height: 44,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
});

export default React.memo(SearchBar);
