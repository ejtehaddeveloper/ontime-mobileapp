import {StyleSheet, Platform} from 'react-native';
import {Colors} from '../../assets/constants';
const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},
  container: {flex: 1, backgroundColor: '#fff'},
  header: {marginTop: 18, alignItems: 'center'},
  title: {fontSize: 22, fontWeight: '800', color: '#111'},

  profileCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: {width: 0, height: 8},
        shadowRadius: 16,
      },
      android: {elevation: 3},
    }),
  },
  profileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameText: {fontSize: 18, fontWeight: '700', color: '#111'},
  phoneText: {fontSize: 13, color: Colors.primary, marginTop: 4},
  editIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    backgroundColor: '#fff',
  },

  section: {marginTop: 20, marginHorizontal: 16},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  rowCard: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowOffset: {width: 0, height: 4},
        shadowRadius: 8,
      },
      android: {elevation: 1},
    }),
  },
  pressedRow: {opacity: 0.85},
  rowLeft: {flexDirection: 'row', alignItems: 'center'},
  rowText: {fontSize: 15},
  rowRight: {},
  smallText: {fontSize: 14, color: '#666'},

  // simple modal backdrop and card
  simpleModalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  simpleModalCard: {
    width: '88%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: {width: 0, height: 8},
        shadowRadius: 12,
      },
      android: {elevation: 6},
    }),
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderColor: '#E8E8E8',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginTop: 8,
  },

  // language options
  simpleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 8,
  },
  simpleOptionSelected: {
    backgroundColor: 'rgba(52,76,183,0.04)',
    borderColor: Colors.primary,
  },
  simpleOptionText: {fontSize: 16, flexShrink: 1},

  // flag wrapper & badge
  flagWrapper: {
    width: 36,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginLeft: 8,
  },
  langSmallFlag: {width: 28, height: 18},

  // small check badge shown inside the flag box when selected
  checkBadge: {
    position: 'absolute',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // buttons
  simpleCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  simpleCancelText: {fontSize: 15, color: '#333'},
  simpleConfirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  simpleConfirmText: {fontSize: 15, color: '#fff', fontWeight: '700'},
});

export default styles;
