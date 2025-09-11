/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useRef, useEffect, useState} from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  useWindowDimensions,
  I18nManager,
} from 'react-native';
import {Colors} from '../constants';

export default function AdSlider({paidAds = []}) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Use hook to track window dimensions dynamically (handles orientation change)
  const {width} = useWindowDimensions();

  const autoScrollInterval = useRef(null);
  const pauseTimeout = useRef(null);

  const startAutoScroll = () => {
    stopAutoScroll();
    autoScrollInterval.current = setInterval(() => {
      const nextIndex =
        currentIndex === paidAds.length - 1 ? 0 : currentIndex + 1;
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          x: nextIndex * width, // paging uses full screen width
          animated: true,
        });
      }
      setCurrentIndex(nextIndex);
    }, 3000);
  };

  const stopAutoScroll = () => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };

  useEffect(() => {
    startAutoScroll();
    return () => stopAutoScroll();
  }, [currentIndex, width]); // restart on width change

  const handleScroll = event => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(slideIndex);
    stopAutoScroll();
    if (pauseTimeout.current) {
      clearTimeout(pauseTimeout.current);
    }
    pauseTimeout.current = setTimeout(() => {
      startAutoScroll();
    }, 3000);
  };

  // containerWidth is the full screen width (used for paging math)
  const containerWidth = width;
  // imageWidth is full screen minus 5px padding on each side -> visible gap 5px each side
  const imageWidth = Math.max(0, Math.round(width - 10));

  return (
    <View style={[styles.container, {width: containerWidth}]}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          {useNativeDriver: false, listener: handleScroll},
        )}
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        contentContainerStyle={{
          flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
        }}>
        {paidAds.map((item, index) => (
          <View
            key={item.id ?? index}
            // each page keeps full width for paging; paddingHorizontal creates visible 5px margins
            style={[
              styles.adContainer,
              {
                width: containerWidth,
                overflow: 'hidden',
                paddingHorizontal: 5, // 5px gap each side
              },
            ]}>
            <Image
              source={{uri: item.image_url}}
              // image uses containerWidth - 10 so it visually sits with 5px margins left/right
              style={[styles.adImage, {width: imageWidth, borderRadius: 20}]}
              resizeMode="cover"
            />
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.pagination}>
        {paidAds.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index ? styles.activeDot : styles.inactiveDot,
              // Smaller dots on narrow devices
              width < 350 ? {width: 8, height: 4, borderRadius: 4} : {},
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    alignItems: 'center',
  },
  adContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adImage: {
    height: '90%',
    borderRadius: 20,
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 5,
  },
  dot: {
    width: 13,
    height: 6,
    borderRadius: 5,
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: Colors.primary,
  },
  inactiveDot: {
    backgroundColor: Colors.border,
  },
});
