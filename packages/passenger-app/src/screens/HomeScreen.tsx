/**
 * @fileoverview Home screen — allows passengers to request a ride.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function HomeScreen(): React.JSX.Element {
  const handleRequestRide = (): void => {
    // Navigation and ride request logic
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where to?</Text>
      <TouchableOpacity style={styles.button} onPress={handleRequestRide}>
        <Text style={styles.buttonText}>Request Ride</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 24 },
  button: { backgroundColor: '#E8000E', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
