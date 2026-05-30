import { useState, useRef, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';

interface CaptureResult {
  uri: string;
  base64: string;
}

export function useCameraCapture() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (permission?.granted) return true;

    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Permissão Necessária',
        'A câmera é necessária para capturar fotos do lacre e documentos.',
      );
      return false;
    }
    return true;
  }, [permission, requestPermission]);

  const capturePhoto = useCallback(async (): Promise<CaptureResult | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    if (!cameraRef.current) {
      Alert.alert('Erro', 'Câmera não está pronta.');
      return null;
    }

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });

      if (!photo?.uri) {
        throw new Error('Falha ao capturar foto');
      }

      const base64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setCapturedUri(photo.uri);
      return { uri: photo.uri, base64 };
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao capturar imagem');
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [requestCameraPermission]);

  const clearCaptured = useCallback(() => {
    setCapturedUri(null);
  }, []);

  return {
    cameraRef,
    permission,
    capturedUri,
    isCapturing,
    requestCameraPermission,
    capturePhoto,
    clearCaptured,
  };
}
