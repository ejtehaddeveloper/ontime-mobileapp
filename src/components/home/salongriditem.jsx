import React, {useMemo, useState} from 'react';
import {TouchableOpacity, Text, StyleSheet, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import hostImge from '../../context/hostImge';
import {Colors} from '../../assets/constants';
import buildImageUri from '../../helpers/buildimageuri';

const SalonGridItem = ({item, size = 100, onPress, isRTL = false}) => {
  //data normalization
  const isSalon = (!item?.images?.logo || !item?.name) && !!item?.salon;
  const data = isSalon ? item.salon : item;
  console.log(isSalon, item?.id);
  const imageSize = Math.min(size - 10, 72);
  const [imgError, setImgError] = useState(false);

  const imageUri = useMemo(
    () => buildImageUri(hostImge, data?.images?.logo),
    [data?.images?.logo],
  );

  const showImage = !!imageUri && !imgError;

  return (
    <TouchableOpacity
      style={[styles.gridItem, {width: size}]}
      activeOpacity={0.85}
      onPress={() => onPress && onPress(!isSalon ? data?.id : item?.id)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={isRTL ? data?.name_ar || data?.name : data?.name}>
      {showImage ? (
        <FastImage
          source={{
            uri: imageUri,
            priority: FastImage.priority.normal,
            cache: FastImage.cacheControl.immutable,
          }}
          resizeMode={FastImage.resizeMode.cover}
          style={[
            styles.image,
            {width: imageSize, height: imageSize, borderRadius: imageSize / 2},
          ]}
          onError={() => setImgError(true)}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {width: imageSize, height: imageSize, borderRadius: imageSize / 2},
          ]}>
          <Ionicons
            name="image-outline"
            size={Math.round(imageSize * 0.48)}
            color={Colors.primary}
          />
        </View>
      )}

      <Text
        style={[
          styles.name,
          {textAlign: 'center', marginTop: 8, width: '100%'},
        ]}
        numberOfLines={2}
        ellipsizeMode="tail">
        {isRTL ? data?.name_ar || data?.name : data?.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridItem: {
    marginBottom: 20,
    marginRight: 15,
    alignItems: 'center',
    padding: 5,
  },
  image: {
    backgroundColor: '#eee',
  },
  fallback: {
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {fontSize: 12, color: '#111', flexShrink: 1},
});

export default React.memo(SalonGridItem);
