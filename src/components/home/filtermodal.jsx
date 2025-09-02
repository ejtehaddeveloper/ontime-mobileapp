// src/components/FilterModal.js
import React, {useMemo} from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';

/**
 * Props
 * - visible: boolean
 * - onClose: () => void
 * - services: Array<{ uuid, name, name_ar }>
 * - addresses: Array<{ id, city, city_ar }>
 * - selectedLocation: number[] | string[]
 * - onToggleLocation: (id) => void
 * - selectedServices: string[] (uuids)
 * - onToggleService: (uuid) => void
 * - sortingOptions: Array<{ id, label2, exclusive? }>
 * - selectedOptions: number[]
 * - toggleSelection: (option) => void
 * - min: string | null
 * - max: string | null
 * - setMin: (v) => void
 * - setMax: (v) => void
 * - onApply: () => void
 * - onReset: () => void
 * - windowWidth: number
 */

const Chip = React.memo(({children, selected, onPress, icon}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.chip, selected && styles.selectedChip]}
    accessibilityRole="button"
    accessibilityState={{selected}}>
    {icon ? <View style={{marginRight: 8}}>{icon}</View> : null}
    <Text style={[styles.chipText, selected && styles.selectedText]}>
      {children}
    </Text>
  </TouchableOpacity>
));

const FilterModal = ({
  visible,
  onClose,
  services = [],
  addresses = [],
  selectedLocation = [],
  onToggleLocation = () => {},
  selectedServices = [],
  onToggleService = () => {},
  sortingOptions = [],
  selectedOptions = [],
  toggleSelection = () => {},
  min = null,
  max = null,
  setMin = () => {},
  setMax = () => {},
  onApply = () => {},
  onReset = () => {},
  windowWidth = 360,
}) => {
  const langIsRTL = i18n.language === 'ar';

  // useMemo to avoid re-rendering long lists unnecessarily
  const servicesRender = useMemo(
    () =>
      services.map(s => {
        const isSelected = selectedServices.includes(s.uuid);
        return (
          <Chip
            key={s.uuid}
            selected={isSelected}
            onPress={() => onToggleService(s.uuid)}>
            {langIsRTL ? s.name_ar : s.name}
          </Chip>
        );
      }),
    [services, selectedServices, onToggleService, langIsRTL],
  );

  const addressesRender = useMemo(
    () =>
      addresses.map(a => {
        const isSelected = selectedLocation.includes(a.id);
        return (
          <Chip
            key={a.id}
            selected={isSelected}
            onPress={() => onToggleLocation(a.id)}
            icon={
              <Ionicons
                name="location"
                size={16}
                color={isSelected ? 'white' : Colors.black3}
              />
            }>
            {langIsRTL ? a.city_ar : a.city}
          </Chip>
        );
      }),
    [addresses, selectedLocation, onToggleLocation, langIsRTL],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Backdrop touch to close */}
        <TouchableOpacity
          activeOpacity={1}
          style={{flex: 1}}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContentWrapper}>
          {/* Using FlatList with a single item keeps heavy content rendering performant */}
          <FlatList
            data={[1]}
            keyExtractor={i => String(i)}
            renderItem={() => (
              <View style={styles.modalInner}>
                <TouchableOpacity
                  style={styles.clearFilter}
                  onPress={onReset}
                  accessibilityRole="button">
                  <Text style={styles.clearFilterText}>{t('Clear')}</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>{t('Services')}</Text>
                <View style={styles.chipRow}>{servicesRender}</View>

                <Text style={styles.sectionTitle}>{t('Address')}</Text>
                <View style={styles.chipRow}>{addressesRender}</View>

                <Text style={[styles.sectionTitle, {marginTop: 8}]}>
                  {t('Sort By')}
                </Text>
                {sortingOptions.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => toggleSelection(option)}
                    style={styles.sortRow}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: selectedOptions.includes(option.id),
                    }}>
                    <Text
                      style={[
                        styles.sortText,
                        selectedOptions.includes(option.id) &&
                          styles.sortTextSelected,
                      ]}>
                      {option.label2}
                    </Text>
                    <View style={styles.checkbox}>
                      {selectedOptions.includes(option.id) && (
                        <View style={styles.checkboxInner} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}

                <Text style={[styles.sectionTitle, {marginTop: 8}]}>
                  {t('Price')}
                </Text>
                <View style={styles.priceInputContainer}>
                  <TextInput
                    placeholder={t('Max')}
                    value={max}
                    onChangeText={setMax}
                    style={styles.priceInput}
                    keyboardType="phone-pad"
                    placeholderTextColor={Colors.black3}
                    accessibilityLabel="Max price"
                  />
                  <TextInput
                    placeholder={t('Min')}
                    value={min}
                    onChangeText={setMin}
                    style={styles.priceInput}
                    keyboardType="phone-pad"
                    placeholderTextColor={Colors.black3}
                    accessibilityLabel="Min price"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      width: Math.min(windowWidth * 0.9, 360),
                      marginVertical: 20,
                    },
                  ]}
                  onPress={onApply}
                  accessibilityRole="button">
                  <Text style={styles.buttonText}>{t('Search')}</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContentWrapper: {
    height: '90%', // 75% of screen height
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalInner: {padding: 20},
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
  clearFilterText: {fontSize: 10, color: Colors.primary},
  sectionTitle: {fontSize: 18, marginTop: 8, fontWeight: '600'},

  chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8},
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c7a88a',
    backgroundColor: 'white',
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedChip: {backgroundColor: '#c7a88a'},
  chipText: {color: '#000', fontSize: 14},
  selectedText: {color: '#fff'},

  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    justifyContent: 'space-between',
  },
  sortText: {fontSize: 16, color: '#333'},
  sortTextSelected: {fontWeight: '700'},
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
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

  button: {
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  buttonText: {fontSize: 18, color: '#fff'},

  // accessibility helper
  visuallyHidden: {
    position: 'absolute',
    height: 1,
    width: 1,
    left: -10000,
    top: 'auto',
    overflow: 'hidden',
  },
});

export default React.memo(FilterModal);
