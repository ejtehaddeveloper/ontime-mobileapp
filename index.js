/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json'
import Loading from './src/assets/common/Loading';
import { Suspense } from 'react';

const AppWithAuthProvider = () => (
    <Suspense fallback={<Loading />}>
  
      <App />
    </Suspense>
  );

  AppRegistry.registerComponent(appName, () => AppWithAuthProvider);

