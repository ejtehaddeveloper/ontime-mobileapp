/* eslint-disable react-native/no-inline-styles */
import React, {useContext, useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
  Pressable,
  Modal,
  SafeAreaView,
} from 'react-native';
import {Colors} from '../../assets/constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
// import salons from '../../data/salons.json';
import {AuthContext} from '../../context/AuthContext';
import {CommonActions, useNavigation} from '@react-navigation/native';
import {Checkout, deleteCart, getCart} from '../../context/api';
import Loading from '../../assets/common/Loading';
import i18n from '../../assets/locales/i18';
import {screenHeight, screenWidth} from '../../assets/constants/ScreenSize';
import {t} from 'i18next';

const {width} = Dimensions.get('window');

const scale = width / 375;

const normalize = size => {
  return Math.round(scale * size);
};

const Cart = () => {
  // const noti = salons;
  const {isAuth} = useContext(AuthContext);
  const isRTL = i18n.language === 'ar';
  const [isVisible4, setIsVisible4] = useState(false);
  const [subloading, setSubloading] = useState(false);

  useEffect(() => {
    console.log('Cart changed:', cart);
  }, [cart]);
  console.log('Cart changed:', cart);

  const navigation = useNavigation();

  const [cart, setcart] = useState([]);
  const [TPrice, setTPrice] = useState([]);
  const [loading, setloading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [ErrorC, setErrorC] = useState('');

  useEffect(() => {
    if (isAuth) {
      fetchData();
    } else {
      navigation.navigate('Auth');
    }
  }, [isAuth, navigation]);

  const fetchData = async () => {
    try {
      const Data = await getCart();
      setcart(Data.data);
      setTPrice(Data);
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      setloading(false);
    }
  };

  const delete_item = async id => {
    try {
      const response = await deleteCart(id);
      console.log('Delete Response:', response);

      if (response) {
        setcart(prevCart => prevCart.filter(item => item.cart_item_id !== id));
        if (cart?.length === 1) {
          navigation.goBack();
        }
      }
    } catch (error) {
      console.log('Cart error', error);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const Done = () => {
    setIsVisible4(false);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'App'}],
      }),
    );
  };

  const Confirm = async () => {
    setSubloading(true);
    try {
      const response = await Checkout('cash');
      if (response) {
        setIsVisible4(true);
      }
    } catch (error) {
      console.log('ERROR', error);
      setErrorC(error);
      setIsVisible(true);
    } finally {
      setSubloading(false);
    }
  };

  const renderServiceItem = ({item}) => (
    <View style={styles.serv}>
      <View>
        <Text style={styles.text}>
          {i18n.language === 'ar'
            ? item?.service?.name_ar
            : item?.service?.name}
        </Text>
        <Text style={styles.title2}>
          {i18n.language === 'ar'
            ? item?.employee?.name_ar
            : item?.employee?.name}
        </Text>
      </View>
      <View style={{flexDirection: 'row'}}>
        <Text style={{marginTop: 10, marginRight: 15}}>
          {item?.service?.price} <Text style={{fontSize: 12}}>QAR</Text>
        </Text>
        <TouchableOpacity
          style={[styles.item, {paddingLeft: 15, paddingRight: 15}]}>
          <Ionicons
            name="remove-circle-outline"
            size={25}
            color={Colors.primary}
            onPress={() => delete_item(item?.cart_item_id)}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
        <View style={styles.header}>
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={25}
            onPress={handleGoBack}
          />
          <Text style={styles.title}>{t('My Cart')}</Text>
          <View />
        </View>
      <ScrollView style={styles.contaner}>
        {loading ? (
          <Loading />
        ) : (
          <>
            <View style={{margin: 15}}>
              <Text style={styles.modalTitle}>{t('Checkout')}</Text>
            </View>
            <View style={{margin: 15}}>
              <Text style={styles.modalTitle}>
                {i18n.language === 'ar'
                  ? cart?.[0]?.salon?.name_ar
                  : cart?.[0]?.salon?.name}
              </Text>
            </View>

            <FlatList
              nestedScrollEnabled={true}
              data={cart}
              renderItem={renderServiceItem}
              keyExtractor={item => item.cart_item_id.toString()}
              style={styles.serviceList}
            />
            {/* <View style={styles.totalRow}>
            <Text style={styles.title2}>Service fees :</Text>
            <Text style={styles.priceText}>2 JDs</Text>
          </View> */}
            <View style={styles.totalRow}>
              <Text style={styles.title2}>{t('Total')} :</Text>
              <Text style={styles.priceText}>
                {TPrice?.total_price} <Text style={{fontSize: 12}}>QAR</Text>
              </Text>
            </View>
            {/* <View style={styles.paymentMethodsContainer}>
                  <View style={styles.choose}>
                    <Ionicons name="wallet-outline" size={25} />
                    <View style={{flexDirection: 'row'}}>
                      <Text style={[styles.title2, {marginRight: 15}]}>
                        Pay Cash
                      </Text>
                      <Ionicons
                        name="ellipse-outline"
                        size={15}
                        color={Colors.black3}
                      />
                    </View>
                  </View>
                  <View style={styles.choose}>
                    <Image source={require('../../assets/images/visa_1.png')} />
                    <View style={{flexDirection: 'row'}}>
                      <Text style={[styles.title2, {marginRight: 15}]}>
                        Pay By Visa
                      </Text>
                      <Ionicons
                        name="ellipse"
                        size={15}
                        color={Colors.black3}
                      />
                    </View>
                  </View>
                </View> */}
            <View style={styles.checkoutButtonsContainer}>
              {subloading ? (
                <Loading />
              ) : (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={Confirm}>
                  <Text style={styles.buttonText}>{t('Confirm')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <Modal
              animationType="slide"
              transparent
              visible={isVisible4}
              onRequestClose={() => setIsVisible4(false)}>
              <Pressable
                style={[styles.modal, {justifyContent: 'center'}]}
                onPress={() => setIsVisible4(false)}>
                <Pressable
                  style={[
                    styles.modal2,
                    {width: 300, borderRadius: 50, alignSelf: 'center'},
                  ]}
                  onPress={e => e.stopPropagation()}>
                  <View
                    style={[
                      styles.modalHeaderContainer,
                      {width: 180, alignSelf: 'flex-end'},
                    ]}>
                    <Text style={[styles.modalTitle, {fontSize: 18}]}>
                      {i18n.language === 'ar' ? 'نجاح' : 'Success'}
                    </Text>
                    <Ionicons
                      name="close-outline"
                      size={25}
                      onPress={() => setIsVisible4(false)}
                    />
                  </View>
                  <Text
                    style={[
                      styles.modalTitle,
                      {alignSelf: 'center', fontSize: 13, textAlign: 'center'},
                    ]}>
                    {i18n.language === 'ar'
                      ? 'تمت عملية الحجز بنجاح'
                      : 'Booking completed successfully'}
                  </Text>
                  <View
                    style={[
                      styles.modalButtonContainer,
                      {justifyContent: 'center'},
                    ]}>
                    <TouchableOpacity style={styles.modalButton} onPress={Done}>
                      <Text style={styles.buttonText}>{t('Done')}</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
            <Modal
              animationType="slide"
              transparent
              visible={isVisible}
              onRequestClose={() => setIsVisible(false)}>
              <Pressable
                style={[styles.modal, {justifyContent: 'center'}]}
                onPress={() => setIsVisible(false)}>
                <Pressable
                  style={[
                    styles.modal2,
                    {width: 300, borderRadius: 50, alignSelf: 'center'},
                  ]}
                  onPress={e => e.stopPropagation()}>
                  <View
                    style={[
                      styles.modalHeaderContainer,
                      {width: 180, alignSelf: 'flex-end'},
                    ]}>
                    <Text style={[styles.modalTitle, {fontSize: 18}]}>
                      {i18n.language === 'ar' ? 'خطأ' : 'Error'}
                    </Text>
                    <Ionicons
                      name="close-outline"
                      size={25}
                      onPress={() => setIsVisible(false)}
                    />
                  </View>
                  <Text
                    style={[
                      styles.modalTitle,
                      {alignSelf: 'center', fontSize: 13, textAlign: 'center'},
                    ]}>
                    {ErrorC}
                  </Text>
                  <View
                    style={[
                      styles.modalButtonContainer,
                      {justifyContent: 'center'},
                    ]}>
                    <TouchableOpacity style={styles.modalButton} onPress={Done}>
                      <Text style={styles.buttonText}>{t('Done')}</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  contaner: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  textButton: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  title3: {
    fontSize: 12,
    color: Colors.black3,
  },
  lable: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    borderBottomColor: Colors.border,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: 15,
    padding: 20,
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
  list: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: 20,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 5,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  totalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  totalPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(27, 31, 38, 0.72)',
  },
  lis: {
    width: 262,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(197,170,150,0.1)',
    justifyContent: 'space-between',
    flexDirection: 'row',
    padding: 10,
    alignSelf: 'center',
    marginTop: 15,
  },
  checkoutButtonsContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingBottom:
      Platform.OS === 'ios' ? screenHeight * 0.07 : screenHeight * 0.07,
    paddingHorizontal: normalize(20),
    justifyContent: 'flex-end',
  },
  confirmButton: {
    // width: '90%',
    // height: 60,
    backgroundColor: Colors.primary,
    // borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: Colors.primary,
    width: '85%',
    maxWidth: 350,
    height: normalize(50),
    borderRadius: normalize(18),
  },
  priceText: {
    marginRight: 15,
  },
  title2: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
    color: Colors.black3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '95%',
    padding: 15,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  serviceList: {
    maxHeight: screenHeight * 0.3,
    padding: 15,
  },
  serv: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-end',
  },
  modal2: {
    width: '100%',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    backgroundColor: '#fff',
    padding: 15,
    maxHeight: screenHeight * 0.8,
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
  },
  modalHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginBottom: 15,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  modalButton: {
    width: '48%',
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    paddingHorizontal: 35,
    alignItems: 'center',
    // width: screenWidth *0.68
  },
});

export default Cart;
