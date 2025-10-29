import React from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';

interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  noPadding?: boolean;
  style?: any;
}

export default function Container({ children, maxWidth = 1200, noPadding = false, style }: ContainerProps) {
  const isWeb = Platform.OS === 'web';
  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={[
      styles.container,
      isWeb && {
        maxWidth: maxWidth,
        width: '100%',
        marginHorizontal: 'auto',
        paddingHorizontal: screenWidth > 768 ? 24 : 16,
      },
      !isWeb && !noPadding && { paddingHorizontal: 16 },
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
