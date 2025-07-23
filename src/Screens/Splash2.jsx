import React, {useState} from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import {Colors} from '../assets/constants';
import {CommonActions, useNavigation} from '@react-navigation/native';
import Video from 'react-native-video';
import {screenHeight} from '../assets/constants/ScreenSize';
import {useTranslation} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useRef} from 'react';
import {Easing} from 'react-native-reanimated';


const {width} = Dimensions.get('window');

const scale = width / 375;

const normalize = size => {
  return Math.round(scale * size);
};


const Splash2 = () => {
  const [pause, setPause] = useState(false);
  const videoRef = useRef(null);
  
   const opacity = useRef(new Animated.Value(1)).current;
  const [key, setKey] = useState(0); // Force remount video for clean restart

  const handleEnd = () => {
     Animated.timing(opacity, {
    toValue: 0,
    duration: 150,
    easing: Easing.in(Easing.quad),
    useNativeDriver: true,
  }).start(() => {
    if (videoRef.current) {
      videoRef.current.seek(0); // restart the video without remounting
    }
    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start();
  });
  };


 

  const navigation = useNavigation();

  const handleLogin = async () => {
    try {
      setPause(true);
      await AsyncStorage.setItem('isWatched', JSON.stringify(true));
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'App'}],
        }),
      );
    } catch (error) {
      console.log('Error saving isWatched:', error);
    }
  };


  const {t} = useTranslation();
  return (
    <View style={styles.container}>
       <Animated.View style={{ opacity, flex: 1 }}>
      <StatusBar hidden={true} />
      <Video
        repeat={true}
        source={require('../assets/video/welcome-1.mp4')} //
        style={styles.backgroundVideo}
        controls={false}
        resizeMode="cover"
        // onEnd={handleEnd}
        paused={pause}
        // ref={videoRef}
        key={key} // Force remount on end
      />
      <SafeAreaView style={styles.body}>
        <View style={styles.contentSection}>
          <Text style={styles.welcomeText}>{t('Welcome to On Time')}</Text>
          <Text style={styles.descriptionText}>
            {t('We`re here to make scheduling your services quick and easy')}
          </Text>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleLogin}>
            <Text style={styles.getStartedText}>{t('Get Started')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  body: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  topSection: {
    width: '100%',
    paddingHorizontal: normalize(20),
    paddingTop: normalize(20),
    alignItems: 'flex-end',
  },
  languageButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: normalize(8),
    paddingHorizontal: normalize(15),
    borderRadius: normalize(15),
  },
  languageButtonText: {
    color: '#fff',
    fontSize: normalize(14),
    fontWeight: '500',
  },
  contentSection: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: screenHeight * 0.1,
    paddingHorizontal: normalize(20),
  },
  welcomeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: normalize(24),
    marginBottom: normalize(15),
    textAlign: 'center',
  },
  descriptionText: {
    color: '#fff',
    fontWeight: '400',
    fontSize: normalize(16),
    width: '80%',
    textAlign: 'center',
    marginBottom: normalize(25),
  },
  getStartedButton: {
    width: '85%',
    maxWidth: 350,
    height: normalize(50),
    backgroundColor: Colors.primary,
    borderRadius: normalize(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: normalize(16),
  },
});

export default Splash2;
