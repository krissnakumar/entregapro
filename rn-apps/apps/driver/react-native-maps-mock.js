import React from 'react';
import { View } from 'react-native';

const MapView = (props) => <View {...props}>{props.children}</View>;
export const Marker = (props) => <View {...props}>{props.children}</View>;
export const Callout = (props) => <View {...props}>{props.children}</View>;
export default MapView;
