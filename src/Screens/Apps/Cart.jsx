/* eslint-disable react-native/no-inline-styles */
/**
 * Refactored Cart screen
 * - Improved performance: memoized callbacks/renderers, FlatList for services, no unnecessary re-renders
 * - Better UX: cleaner header, consistent spacing, single unified modal for messages, optimistic deletes
 * - More maintainable: small helpers, descriptive names, proper effect deps
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useContext,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
  Pressable,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {Colors} from '../../assets/constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AuthContext} from '../../context/AuthContext';
import {CommonActions, useNavigation} from '@react-navigation/native';
import {Checkout, deleteCart, getCart} from '../../context/api';
import Loading from '../../assets/common/Loading';
import i18n from '../../assets/locales/i18';
import {screenHeight, screenWidth} from '../../assets/constants/ScreenSize';
import {t} from 'i18next';

const {width} = Dimensions.get('window');
const scale = width / 375;
const normalize = size => Math.round(scale * size);

const currencyLabel = i18n.language === 'ar' ? 'ر.ق' : 'QAR';

const EmptyList = ({text}) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const Cart = () => {
  const {isAuth} = useContext(AuthContext);
  const isRTL = i18n.language === 'ar';
  const navigation = useNavigation();

  // data
  const [cartItems, setCartItems] = useState([]);
  const [totals, setTotals] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true); // initial load
  const [submitting, setSubmitting] = useState(false); // checkout request
  const [messageModal, setMessageModal] = useState({
    visible: false,
    title: '',
    message: '',
  });

  // fetch cart
  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getCart();
      if (response) {
        // response.data expected to be array of items
        setCartItems(Array.isArray(response.data) ? response.data : []);
        setTotals(response);
      } else {
        setCartItems([]);
        setTotals(null);
      }
    } catch (err) {
      console.error('getCart error:', err);
      setCartItems([]);
      setTotals(null);
      setMessageModal({
        visible: true,
        title: i18n.language === 'ar' ? 'خطأ' : 'Error',
        message:
          i18n.language === 'ar'
            ? 'حدث خطأ أثناء جلب السلة'
            : 'Failed to load cart.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // require auth
  useEffect(() => {
    if (!isAuth) {
      navigation.navigate('Auth');
      return;
    }
    fetchCart();
  }, [isAuth, fetchCart, navigation]);

  // helper: optimistic delete
  const handleDeleteItem = useCallback(
    async cartItemId => {
      // optimistic update
      setCartItems(prev => prev.filter(it => it.cart_item_id !== cartItemId));

      try {
        await deleteCart(cartItemId);
        // if last item removed, go back
        setTimeout(() => {
          if (cartItems.length === 1) navigation.goBack();
        }, 100);
      } catch (err) {
        console.error('deleteCart error:', err);
        // revert by re-fetching (simpler than complex undo logic)
        fetchCart();
        setMessageModal({
          visible: true,
          title: i18n.language === 'ar' ? 'خطأ' : 'Error',
          message:
            i18n.language === 'ar'
              ? 'فشل حذف العنصر، حاول مرة أخرى'
              : 'Failed to remove item. Please try again.',
        });
      }
    },
    [cartItems.length, fetchCart, navigation],
  );

  // handle checkout
  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await Checkout('cash');
      if (res) {
        setMessageModal({
          visible: true,
          title: i18n.language === 'ar' ? 'نجاح' : 'Success',
          message:
            i18n.language === 'ar'
              ? 'تمت عملية الحجز بنجاح'
              : 'Booking completed successfully',
          onClose: () => {
            // reset navigation to App
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{name: 'App'}],
              }),
            );
          },
        });
      } else {
        setMessageModal({
          visible: true,
          title: i18n.language === 'ar' ? 'خطأ' : 'Error',
          message:
            i18n.language === 'ar'
              ? 'فشل الدفع، حاول لاحقًا'
              : 'Payment failed, please try later.',
        });
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setMessageModal({
        visible: true,
        title: i18n.language === 'ar' ? 'خطأ' : 'Error',
        message:
          err?.toString?.() ??
          (i18n.language === 'ar' ? 'خطأ غير معروف' : 'Unknown error'),
      });
    } finally {
      setSubmitting(false);
      // refresh cart to reflect server state
      fetchCart();
    }
  }, [fetchCart, navigation]);

  // render each cart row (memoized)
  const renderServiceItem = useCallback(
    ({item}) => {
      const serviceName =
        i18n.language === 'ar' ? item?.service?.name_ar : item?.service?.name;
      const employeeName =
        i18n.language === 'ar' ? item?.employee?.name_ar : item?.employee?.name;
      const dateStr = item?.date ? item.date.slice(5) : '';
      const price = item?.service?.price ?? 0;

      return (
        <View style={styles.servRow}>
          <View style={styles.servLeft}>
            <Text style={styles.serviceName} numberOfLines={2}>
              {serviceName}
            </Text>
            <Text style={styles.employeeName} numberOfLines={1}>
              {employeeName}
            </Text>
            <Text style={styles.smallMeta}>
              {dateStr} {t('at')} {item?.start_time}
            </Text>
          </View>

          <View style={styles.servRight}>
            <Text style={styles.price}>
              {price} <Text style={styles.priceCurrency}>{currencyLabel}</Text>
            </Text>

            <TouchableOpacity
              accessible
              accessibilityLabel={i18n.language === 'ar' ? 'إزالة' : 'Remove'}
              style={styles.removeBtn}
              onPress={() => handleDeleteItem(item?.cart_item_id)}>
              <Ionicons
                name="remove-circle-outline"
                size={22}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [handleDeleteItem],
  );

  const listKeyExtractor = useCallback(item => String(item.cart_item_id), []);

  const totalPriceDisplay = useMemo(() => {
    if (!totals) return `0 ${currencyLabel}`;
    // totals.total_price might be number or string depending on API
    return `${totals.total_price ?? '0'} ${currencyLabel}`;
  }, [totals]);

  // header back
  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.wrapper}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Checkout')}</Text>
          <View style={{width: 24}} />
        </View>

        <View style={styles.loaderWrap}>
          <Loading />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('Checkout')}</Text>

        <View style={{width: 24}} />
      </View>

      <FlatList
        data={cartItems}
        renderItem={renderServiceItem}
        keyExtractor={listKeyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyList text={t('No services in cart')} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={11}
      />

      <View style={styles.summary}>
        <Text style={styles.totalLabel}>{t('Total')} :</Text>
        <Text style={styles.totalValue}>{totalPriceDisplay}</Text>
      </View>

      <View style={styles.checkoutButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            submitting ? styles.disabledButton : null,
          ]}
          onPress={handleConfirm}
          disabled={submitting || cartItems.length === 0}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>{t('Confirm')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Unified Message Modal (success / error / info) */}
      <Modal
        visible={messageModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setMessageModal(prev => ({...prev, visible: false}))
        }>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMessageModal(prev => ({...prev, visible: false}))}>
          <Pressable
            style={styles.modalCard}
            onPress={e => e.stopPropagation()}>
            <View style={styles.modalIconWrap}>
              <Ionicons
                name={
                  messageModal.title ===
                  (i18n.language === 'ar' ? 'نجاح' : 'Success')
                    ? 'checkmark-circle'
                    : 'alert-circle'
                }
                size={44}
                color={
                  messageModal.title ===
                  (i18n.language === 'ar' ? 'نجاح' : 'Success')
                    ? Colors.primary
                    : '#e74c3c'
                }
              />
            </View>

            <Text style={styles.modalTitleText}>{messageModal.title}</Text>
            <Text style={styles.modalMessageText}>{messageModal.message}</Text>

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => {
                setMessageModal(prev => ({...prev, visible: false}));
                // call optional onClose if provided
                messageModal.onClose && messageModal.onClose();
              }}>
              <Text style={styles.modalActionText}>{t('Done')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: {flex: 1, backgroundColor: '#fff'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
  },
  headerTitle: {fontSize: 18, fontWeight: '700', color: Colors.text},

  loaderWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  listContent: {paddingHorizontal: 20, paddingBottom: 24},

  servRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  servLeft: {flex: 1, paddingRight: 12},
  serviceName: {fontSize: 15, fontWeight: '700', color: Colors.text},
  employeeName: {fontSize: 12, color: Colors.black3, marginTop: 6},
  smallMeta: {fontSize: 11, color: Colors.black3, marginTop: 4},

  servRight: {alignItems: 'flex-end', justifyContent: 'center'},

  price: {fontSize: 14, fontWeight: '800', color: Colors.text},
  priceCurrency: {fontSize: 12, color: Colors.text},

  removeBtn: {marginTop: 8},

  separator: {height: 1, backgroundColor: Colors.border, opacity: 0.6},

  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#fff',
  },
  totalLabel: {fontSize: 14, fontWeight: '700', color: Colors.black3},
  totalValue: {fontSize: 16, fontWeight: '800', color: Colors.text},

  checkoutButtonsContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom:
      Platform.OS === 'ios' ? screenHeight * 0.04 : screenHeight * 0.03,
  },

  confirmButton: {
    width: '100%',
    maxWidth: 420,
    height: normalize(50),
    backgroundColor: Colors.primary,
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  confirmButtonText: {color: '#fff', fontWeight: '700', fontSize: 16},

  disabledButton: {opacity: 0.7},

  // empty state
  emptyContainer: {padding: 40, alignItems: 'center'},
  emptyText: {color: Colors.black3, fontSize: 14},

  // modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  modalIconWrap: {marginBottom: 8},
  modalTitleText: {fontSize: 18, fontWeight: '700', marginBottom: 8},
  modalMessageText: {
    fontSize: 14,
    color: Colors.black3,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalActionBtn: {
    width: 140,
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: {color: '#fff', fontWeight: '700'},
});

export default Cart;
