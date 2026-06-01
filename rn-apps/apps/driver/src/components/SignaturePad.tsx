import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SignaturePadProps {
  onSave: (base64Svg: string) => void;
  onClose: () => void;
}

function encodeBase64(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  const bytes = [];
  for (let j = 0; j < str.length; j++) {
    const code = str.charCodeAt(j);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    } else {
      j++;
      const nextCode = str.charCodeAt(j);
      const unicode = 0x10000 + (((code & 0x3ff) << 10) | (nextCode & 0x3ff));
      bytes.push(
        0xf0 | (unicode >> 18),
        0x82 | ((unicode >> 12) & 0x3f),
        0x82 | ((unicode >> 6) & 0x3f),
        0x82 | (unicode & 0x3f)
      );
    }
  }

  while (i < bytes.length) {
    const c1 = bytes[i++] & 0xff;
    if (i === bytes.length) {
      result += chars.charAt(c1 >> 2);
      result += chars.charAt((c1 & 0x3) << 4);
      result += '==';
      break;
    }
    const c2 = bytes[i++];
    if (i === bytes.length) {
      result += chars.charAt(c1 >> 2);
      result += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
      result += chars.charAt((c2 & 0xf) << 2);
      result += '=';
      break;
    }
    const c3 = bytes[i++];
    result += chars.charAt(c1 >> 2);
    result += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
    result += chars.charAt(((c2 & 0xf) << 2) | ((c3 & 0xc0) >> 6));
    result += chars.charAt(c3 & 0x3f);
  }
  return result;
}

export default function SignaturePad({ onSave, onClose }: SignaturePadProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const currentPathRef = useRef<string[]>([]);
  const [displayPath, setDisplayPath] = useState<string[]>([]);
  const containerWidth = useRef(Dimensions.get('window').width - 32);
  const containerHeight = 250;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const start = [`M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`];
      currentPathRef.current = start;
      setDisplayPath(start);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      currentPathRef.current = [...currentPathRef.current, `L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`];
      setDisplayPath(currentPathRef.current);
    },
    onPanResponderRelease: () => {
      if (currentPathRef.current.length > 0) {
        setPaths((prev) => [...prev, currentPathRef.current.join(' ')]);
        currentPathRef.current = [];
        setDisplayPath([]);
      }
    },
  }), []);

  const handleClear = useCallback(() => {
    setPaths([]);
    currentPathRef.current = [];
    setDisplayPath([]);
  }, []);

  const handleConfirm = useCallback(() => {
    if (paths.length === 0) {
      return;
    }

    const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${containerWidth.current} ${containerHeight}" width="${containerWidth.current}" height="${containerHeight}"><rect width="100%" height="100%" fill="#ffffff" />${paths
      .map(
        (p) =>
          `<path d="${p}" fill="none" stroke="#1E293B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
      )
      .join('')}</svg>`;

    const base64Svg = `data:image/svg+xml;base64,${encodeBase64(svgXml)}`;
    onSave(base64Svg);
  }, [paths, onSave]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>✍️ Assinatura Digital</Text>
        <Text style={styles.subtitle}>Assine com o dedo no espaço em branco abaixo</Text>
      </View>

      <View
        style={styles.canvasContainer}
        {...panResponder.panHandlers}
        onLayout={(evt) => {
          containerWidth.current = evt.nativeEvent.layout.width;
        }}
      >
        <Svg style={styles.svg}>
          {paths.map((p, idx) => (
            <Path
              key={idx}
              d={p}
              stroke="#1E293B"
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {displayPath.length > 0 && (
            <Path
              d={displayPath.join(' ')}
              stroke="#1E293B"
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
        {paths.length === 0 && displayPath.length === 0 && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Escreva sua assinatura aqui</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearBtnText}>Limpar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, paths.length === 0 && styles.saveBtnDisabled]}
          onPress={handleConfirm}
          disabled={paths.length === 0}
        >
          <Text style={styles.saveBtnText}>Confirmar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  canvasContainer: {
    height: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    overflow: 'hidden',
    position: 'relative',
  },
  svg: {
    flex: 1,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  placeholderText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  closeBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  clearBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  saveBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
