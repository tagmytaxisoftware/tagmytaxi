/**
 * @fileoverview Root navigation stack for the driver app.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { OnlineScreen } from '../screens/OnlineScreen';

export type DriverStackParamList = {
  Online: undefined;
  RideRequest: { rideId: string };
  ActiveRide: { rideId: string };
  Earnings: undefined;
};

const Stack = createStackNavigator<DriverStackParamList>();

export function AppNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Online">
        <Stack.Screen name="Online" component={OnlineScreen} options={{ title: 'TagMyTaxi Driver' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
