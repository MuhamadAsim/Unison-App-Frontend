import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ListItem({ title, subtitle, rightElement, onPress, style }) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={[styles.container, style]} onPress={onPress}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightElement && <View style={styles.rightContainer}>{rightElement}</View>}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  rightContainer: {
    marginLeft: 12,
  },
});
