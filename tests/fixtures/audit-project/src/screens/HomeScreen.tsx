/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, TextInput, Animated } from 'react-native';
import { format } from 'moment';
import _ from 'lodash';

const unusedVar = 'this is imported but never used';

export default function HomeScreen() {
  const [data, setData] = useState([]);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log('fetching data...');
    }, 5000);
  }, []);

  useEffect(() => {
    document.addEventListener('scroll', handleScroll);
  }, []);

  const handleScroll = () => {};

  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 500,
  }).start();

  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <View>
      <TextInput placeholder="Search" />
      <ScrollView>
        {items.map((item) => (
          <TouchableOpacity key={item} style={{ width: 30, height: 30 }}>
            <Text style={{ fontSize: 8 }}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
