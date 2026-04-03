import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// ─── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primarySoft: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  bg: '#F8F8FC',
};

export default function SplashScreen() {
  // Animation values
  const ringScale1  = useRef(new Animated.Value(0)).current;
  const ringScale2  = useRef(new Animated.Value(0)).current;
  const ringScale3  = useRef(new Animated.Value(0)).current;
  const ringOpacity1 = useRef(new Animated.Value(0)).current;
  const ringOpacity2 = useRef(new Animated.Value(0)).current;
  const ringOpacity3 = useRef(new Animated.Value(0)).current;

  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const titleOpacity    = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(14)).current;

  const taglineOpacity    = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(10)).current;

  const dotsOpacity = useRef(new Animated.Value(0)).current;

  // Dot pulse animations
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // ── Phase 1: rings expand ─────────────────────────────────────────────
    const rings = Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(ringScale1, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ringOpacity1, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ringScale2, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ringOpacity2, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ringScale3, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ringOpacity3, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]);

    // ── Phase 2: logo pops in ──────────────────────────────────────────────
    const logo = Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]);

    // ── Phase 3: title slides up ───────────────────────────────────────────
    const title = Animated.parallel([
      Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(titleTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);

    // ── Phase 4: tagline + dots ────────────────────────────────────────────
    const tagline = Animated.parallel([
      Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(taglineTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(dotsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]);

    // ── Sequence ───────────────────────────────────────────────────────────
    Animated.sequence([
      rings,
      Animated.delay(60),
      logo,
      Animated.delay(120),
      title,
      Animated.delay(80),
      tagline,
    ]).start();

    // ── Loading dot pulse loop ─────────────────────────────────────────────
    const pulseDot = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );

    setTimeout(() => {
      pulseDot(dot1, 0).start();
      pulseDot(dot2, 160).start();
      pulseDot(dot3, 320).start();
    }, 1400);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Decorative top-right blob */}
      <View style={styles.blobTopRight} />
      {/* Decorative bottom-left blob */}
      <View style={styles.blobBottomLeft} />

      {/* ── Logo area ────────────────────────────────────────────────────── */}
      <View style={styles.logoArea}>

        {/* Ripple rings */}
        <View style={styles.ringsContainer}>
          <Animated.View style={[
            styles.ring, styles.ring3,
            { transform: [{ scale: ringScale3 }], opacity: ringOpacity3 }
          ]} />
          <Animated.View style={[
            styles.ring, styles.ring2,
            { transform: [{ scale: ringScale2 }], opacity: ringOpacity2 }
          ]} />
          <Animated.View style={[
            styles.ring, styles.ring1,
            { transform: [{ scale: ringScale1 }], opacity: ringOpacity1 }
          ]} />

          {/* Logo hexagon */}
          <Animated.View style={[
            styles.logoWrap,
            { transform: [{ scale: logoScale }], opacity: logoOpacity }
          ]}>
            {/* Inner icon: stylised "U" made from two overlapping circles */}
            <View style={styles.logoInner}>
              <View style={styles.uLeft} />
              <View style={styles.uRight} />
              <View style={styles.uBridge} />
            </View>
          </Animated.View>
        </View>

        {/* App name */}
        <Animated.Text style={[
          styles.appName,
          { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }
        ]}>
          UNISON
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[
          styles.tagline,
          { opacity: taglineOpacity, transform: [{ translateY: taglineTranslateY }] }
        ]}>
          Alumni · Students · Opportunities
        </Animated.Text>
      </View>

      {/* ── Loading dots ─────────────────────────────────────────────────── */}
      <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
        <Animated.View style={[styles.dot, { opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { opacity: dot2 }]} />
        <Animated.View style={[styles.dot, { opacity: dot3 }]} />
      </Animated.View>

      {/* Bottom wordmark */}
      <Animated.Text style={[styles.wordmark, { opacity: taglineOpacity }]}>
        Powered by UniVerse Network
      </Animated.Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Decorative blobs ──
  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: C.primarySoft,
    opacity: 0.7,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: C.primarySoft,
    opacity: 0.5,
  },

  // ── Logo area ──
  logoArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  ringsContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },

  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  ring1: {
    width: 96,
    height: 96,
    borderColor: C.primaryBorder,
    backgroundColor: C.primarySoft,
  },
  ring2: {
    width: 128,
    height: 128,
    borderColor: '#D4D0FA',
    backgroundColor: 'rgba(238,242,255,0.6)',
  },
  ring3: {
    width: 160,
    height: 160,
    borderColor: '#E0DEFF',
    backgroundColor: 'rgba(238,242,255,0.3)',
  },

  // ── Logo hex / icon ──
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 10,
  },
  logoInner: {
    width: 38,
    height: 38,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  // "U" shape: two vertical bars + curved bottom bridge
  uLeft: {
    position: 'absolute',
    left: 4,
    top: 2,
    width: 7,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  uRight: {
    position: 'absolute',
    right: 4,
    top: 2,
    width: 7,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  uBridge: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    right: 4,
    height: 7,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#fff',
  },

  // ── Typography ──
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 10,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ── Loading dots ──
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 56,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.primary,
  },

  // ── Wordmark ──
  wordmark: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    color: '#C4C4D0',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
});