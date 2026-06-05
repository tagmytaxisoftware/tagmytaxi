/**
 * @fileoverview Online/Offline toggle screen for drivers.
 * When online, the driver's location is published via WebSocket every 2 seconds.
 */

import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

export function OnlineScreen(): React.JSX.Element {
  const [isOnline, setIsOnline] = useState(false);

  const handleToggle = (value: boolean): void => {
    setIsOnline(value);
    // Production: notify server via WebSocket, start location publishing
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.status, isOnline ? styles.online : styles.offline]}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
      <Switch
        value={isOnline}
        onValueChange={handleToggle}
        trackColor={{ false: '#9CA3AF', true: '#E8000E' }}
        thumbColor="#fff"
      />
      <Text style={styles.hint}>
        {isOnline ? 'You are visible to passengers' : 'Toggle to start receiving rides'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  status: { fontSize: 32, fontWeight: '700' },
  online: { color: '#059669' },
  offline: { color: '#6B7280' },
  hint: { fontSize: 14, color: '#6B7280', marginTop: 8 },
});
