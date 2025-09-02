import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../assets/constants';
import {t} from 'i18next';
import i18n from '../../assets/locales/i18';

const Header = ({userInfo, isAuth, cartLength, onCartPress}) => {
  return (
    <View style={styles.headerContainer}>
      <View>
        <Text style={[styles.title, {fontSize: 24}]}>{t('Welcome')}</Text>
        {isAuth && <Text style={styles.name1}>{userInfo?.name} !</Text>}
      </View>

      {isAuth && cartLength > 0 && (
        <TouchableOpacity onPress={onCartPress} style={styles.cartIcon}>
          <Text style={styles.cartLength}>{cartLength}</Text>
          <Ionicons name="cart-outline" size={25} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {fontSize: 18, marginTop: 5, fontWeight: '600'},
  name1: {
    fontSize: 14,
    color: Colors.black1,
    marginTop: 5,
    marginHorizontal: 5,
    alignSelf: 'flex-start',
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
  cartIcon: {padding: 8},
});

export default React.memo(Header);
